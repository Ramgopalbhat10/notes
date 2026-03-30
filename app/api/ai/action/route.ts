import { NextRequest } from "next/server";
import { generateText, streamText } from "ai";

import { DEFAULT_CHAT_MODEL, parseModelId } from "@/lib/ai/models";
import { requireApiUser } from "@/lib/auth";
import { getRedisClient } from "@/lib/cache/redis-client";
import { jsonResponse } from "@/lib/http/response";
import { safeString } from "@/lib/utils";

type ActionType = "improve" | "summarize" | "expand";
type ContextMode = "selection" | "document";
type RequestKind = "initial" | "refine";

type ActionRequestBody = {
  action: ActionType;
  document: string;
  selection?: string;
  contextMode: ContextMode;
  requestKind?: RequestKind;
  instruction?: string;
  previousResult?: string;
  model?: string | null;
};

type ParsedActionRequest = {
  action: ActionType;
  document: string;
  selection: string;
  contextMode: ContextMode;
  requestKind: RequestKind;
  instruction: string;
  previousResult: string;
  model: string;
};

type ChunkPlan = {
  chunks: string[];
  processingMode: "single" | "chunked";
};

export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const CHUNK_TARGET_CHARS = 18_000;
const CHUNK_HARD_MAX_CHARS = 24_000;

const inMemoryRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request);
    if (!authResult.ok) {
      return jsonResponse({ error: authResult.error }, { status: authResult.status });
    }

    const identifier = getClientIdentifier(request);
    const allowed = await consumeRateLimit(identifier);
    if (!allowed) {
      return jsonResponse({ error: "Too many requests. Please wait and try again." }, { status: 429 });
    }

    const parsed = await parseRequest(request);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, { status: parsed.status });
    }

    const payload = parsed.value;
    const sourceText = getSourceText(payload);
    if (!sourceText.trim()) {
      return jsonResponse({ error: "Nothing to process" }, { status: 400 });
    }

    const chunkPlan = planChunks(sourceText);

    if (payload.requestKind === "refine") {
      const result = await streamText({
        model: payload.model,
        system: buildSystemPrompt(payload.action),
        prompt: buildRefinePrompt(payload),
        temperature: payload.action === "summarize" ? 0.2 : 0.6,
      });

      return result.toTextStreamResponse({
        headers: buildResponseHeaders({
          action: payload.action,
          contextMode: payload.contextMode,
          processingMode: chunkPlan.processingMode,
          truncated: false,
        }),
      });
    }

    if (chunkPlan.processingMode === "single") {
      const result = await streamText({
        model: payload.model,
        system: buildSystemPrompt(payload.action),
        prompt: buildInitialPrompt({
          action: payload.action,
          contextMode: payload.contextMode,
          content: chunkPlan.chunks[0] ?? sourceText,
        }),
        temperature: payload.action === "summarize" ? 0.2 : 0.65,
      });

      return result.toTextStreamResponse({
        headers: buildResponseHeaders({
          action: payload.action,
          contextMode: payload.contextMode,
          processingMode: "single",
          truncated: false,
        }),
      });
    }

    if (payload.action === "summarize") {
      const chunkSummaries: string[] = [];
      for (const [index, chunk] of chunkPlan.chunks.entries()) {
        chunkSummaries.push(
          await summarizeChunk({
            model: payload.model,
            chunk,
            index,
            total: chunkPlan.chunks.length,
            contextMode: payload.contextMode,
          }),
        );
      }

      const result = await streamText({
        model: payload.model,
        system: buildSystemPrompt("summarize"),
        prompt: buildCombinedSummaryPrompt({
          contextMode: payload.contextMode,
          chunkSummaries,
        }),
        temperature: 0.2,
      });

      return result.toTextStreamResponse({
        headers: buildResponseHeaders({
          action: payload.action,
          contextMode: payload.contextMode,
          processingMode: "chunked",
          truncated: false,
        }),
      });
    }

    return new Response(
      createChunkedRewriteStream({
        action: payload.action,
        contextMode: payload.contextMode,
        model: payload.model,
        chunks: chunkPlan.chunks,
      }),
      {
        headers: buildResponseHeaders({
          action: payload.action,
          contextMode: payload.contextMode,
          processingMode: "chunked",
          truncated: false,
        }),
      },
    );
  } catch (error) {
    console.error("/api/ai/action failed", error);
    return jsonResponse({ error: "Failed to process AI action" }, { status: 500 });
  }
}

async function parseRequest(
  request: NextRequest,
): Promise<
  | { ok: true; value: ParsedActionRequest }
  | { ok: false; error: string; status: number }
> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  const candidate = body as Partial<ActionRequestBody>;
  const action = isValidAction(candidate.action) ? candidate.action : null;
  const contextMode = isValidContextMode(candidate.contextMode) ? candidate.contextMode : null;
  const requestKind = isValidRequestKind(candidate.requestKind) ? candidate.requestKind : "initial";
  const document = safeString(candidate.document);
  const selection = safeString(candidate.selection);
  const instruction = safeString(candidate.instruction);
  const previousResult = safeString(candidate.previousResult);
  const model = parseModelId(safeString(candidate.model)) || parseModelId(process.env.AI_MODEL) || DEFAULT_CHAT_MODEL;

  if (!action) {
    return { ok: false, error: "Unsupported action", status: 400 };
  }

  if (!contextMode) {
    return { ok: false, error: "Unsupported context mode", status: 400 };
  }

  if (!document.trim()) {
    return { ok: false, error: "Document content is required", status: 400 };
  }

  if (contextMode === "selection" && !selection.trim()) {
    return { ok: false, error: "Selection content is required for selection-based actions", status: 400 };
  }

  if (requestKind === "refine" && (!previousResult.trim() || !instruction.trim())) {
    return { ok: false, error: "Refinement requests require both a prior draft and new instructions", status: 400 };
  }

  return {
    ok: true,
    value: {
      action,
      document,
      selection,
      contextMode,
      requestKind,
      instruction,
      previousResult,
      model,
    },
  };
}

function getSourceText(payload: ParsedActionRequest): string {
  if (payload.requestKind === "refine") {
    return payload.previousResult;
  }
  return payload.contextMode === "selection" ? payload.selection : payload.document;
}

function buildResponseHeaders({
  action,
  contextMode,
  processingMode,
  truncated,
}: {
  action: ActionType;
  contextMode: ContextMode;
  processingMode: "single" | "chunked";
  truncated: boolean;
}): HeadersInit {
  return {
    "content-type": "text/plain; charset=utf-8",
    "x-ai-action": action,
    "x-ai-context-mode": contextMode,
    "x-ai-processing-mode": processingMode,
    "x-ai-input-truncated": truncated ? "1" : "0",
  };
}

function getClientIdentifier(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for");
  if (header) {
    const [first] = header.split(",");
    if (first && first.trim()) {
      return first.trim();
    }
  }
  return request.headers.get("cf-connecting-ip") ?? "anonymous";
}

async function consumeRateLimit(identifier: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const bucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
    const key = `ai:action:${identifier}:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    }
    return count <= RATE_LIMIT_MAX_REQUESTS;
  } catch {
    return consumeInMemoryRateLimit(identifier);
  }
}

function consumeInMemoryRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = inMemoryRateLimitStore.get(identifier);
  if (!entry || entry.resetAt <= now) {
    inMemoryRateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function buildSystemPrompt(action: ActionType): string {
  const base =
    "You are an expert writing assistant working with Markdown content. Maintain the author's intent, preserve valid Markdown structure, and respond with clean Markdown only.";
  const actionHints: Record<ActionType, string> = {
    improve: "Improve clarity, flow, and phrasing without changing the meaning.",
    summarize: "Summarize the content accurately without inventing new facts.",
    expand: "Expand the ideas with richer helpful detail while staying grounded in the source.",
  };

  return `${base} ${actionHints[action]}`;
}

function buildInitialPrompt({
  action,
  contextMode,
  content,
}: {
  action: ActionType;
  contextMode: ContextMode;
  content: string;
}): string {
  const contextLine = contextMode === "selection"
    ? "The user selected this excerpt:"
    : "The user wants you to work on this Markdown note:";
  const actionLine: Record<ActionType, string> = {
    improve: "Rewrite it to improve the writing while preserving structure and intent.",
    summarize: "Produce a concise Markdown summary. Use bullets only when they help readability.",
    expand: "Expand it into a more complete explanation while keeping it focused and well-structured.",
  };

  return [actionLine[action], contextLine, content].join("\n\n");
}

function buildRefinePrompt(payload: ParsedActionRequest): string {
  const sourceLabel = payload.contextMode === "selection" ? "original selection" : "original note";
  return [
    "Revise the current AI draft using the user's follow-up instructions.",
    `Use the ${sourceLabel} to stay grounded. Preserve clean Markdown formatting.`,
    "Original source:",
    payload.contextMode === "selection" ? payload.selection : payload.document,
    "Current AI draft:",
    payload.previousResult,
    "User instructions:",
    payload.instruction,
  ].join("\n\n");
}

function buildChunkPrompt({
  action,
  contextMode,
  content,
  index,
  total,
}: {
  action: ActionType;
  contextMode: ContextMode;
  content: string;
  index: number;
  total: number;
}): string {
  const scope = contextMode === "selection" ? "selected excerpt" : "document excerpt";
  const actionLine: Record<ActionType, string> = {
    improve: "Improve this excerpt while preserving the meaning and Markdown structure.",
    summarize: "Summarize this excerpt in concise Markdown.",
    expand: "Expand this excerpt with more useful detail while preserving structure.",
  };

  return [
    `${actionLine[action]} This is part ${index + 1} of ${total} from the same ${scope}.`,
    "Return only the rewritten Markdown for this excerpt.",
    content,
  ].join("\n\n");
}

function buildCombinedSummaryPrompt({
  contextMode,
  chunkSummaries,
}: {
  contextMode: ContextMode;
  chunkSummaries: string[];
}): string {
  const scope = contextMode === "selection" ? "selection" : "note";
  return [
    `Combine these partial summaries into one coherent final summary of the ${scope}.`,
    "Avoid repeating points between sections and keep the final response concise.",
    chunkSummaries.join("\n\n---\n\n"),
  ].join("\n\n");
}

async function summarizeChunk({
  model,
  chunk,
  index,
  total,
  contextMode,
}: {
  model: string;
  chunk: string;
  index: number;
  total: number;
  contextMode: ContextMode;
}): Promise<string> {
  const result = await generateText({
    model,
    system: buildSystemPrompt("summarize"),
    prompt: buildChunkPrompt({
      action: "summarize",
      contextMode,
      content: chunk,
      index,
      total,
    }),
    temperature: 0.2,
  });

  return result.text.trim();
}

function createChunkedRewriteStream({
  action,
  contextMode,
  model,
  chunks,
}: {
  action: Exclude<ActionType, "summarize">;
  contextMode: ContextMode;
  model: string;
  chunks: string[];
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const [index, chunk] of chunks.entries()) {
          const result = await generateText({
            model,
            system: buildSystemPrompt(action),
            prompt: buildChunkPrompt({
              action,
              contextMode,
              content: chunk,
              index,
              total: chunks.length,
            }),
            temperature: action === "improve" ? 0.55 : 0.65,
          });

          const prefix = index > 0 ? "\n\n" : "";
          controller.enqueue(encoder.encode(`${prefix}${result.text.trim()}`));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function planChunks(text: string): ChunkPlan {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { chunks: [""], processingMode: "single" };
  }

  if (normalized.length <= CHUNK_HARD_MAX_CHARS) {
    return { chunks: [normalized], processingMode: "single" };
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= CHUNK_HARD_MAX_CHARS) {
      current = candidate;
      if (current.length >= CHUNK_TARGET_CHARS) {
        pushCurrent();
      }
      continue;
    }

    pushCurrent();

    if (paragraph.length <= CHUNK_HARD_MAX_CHARS) {
      current = paragraph;
      continue;
    }

    const sentenceChunks = splitOversizedParagraph(paragraph);
    for (const piece of sentenceChunks) {
      if (piece.length <= CHUNK_TARGET_CHARS) {
        chunks.push(piece);
      } else {
        chunks.push(...splitByCharacterWindow(piece, CHUNK_TARGET_CHARS));
      }
    }
  }

  pushCurrent();

  return {
    chunks: chunks.length > 0 ? chunks : [normalized],
    processingMode: chunks.length > 1 ? "chunked" : "single",
  };
}

function splitOversizedParagraph(paragraph: string): string[] {
  const sentences = splitIntoSentenceLikeSegments(paragraph);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (candidate.length <= CHUNK_HARD_MAX_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    if (sentence.length <= CHUNK_HARD_MAX_CHARS) {
      current = sentence.trim();
      continue;
    }

    chunks.push(...splitByCharacterWindow(sentence.trim(), CHUNK_TARGET_CHARS));
    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitIntoSentenceLikeSegments(text: string): string[] {
  const segments: string[] = [];
  let segmentStart = 0;
  let index = 0;

  while (index < text.length) {
    const character = text[index];
    if (character !== "." && character !== "!" && character !== "?") {
      index += 1;
      continue;
    }

    let segmentEnd = index + 1;
    while (
      segmentEnd < text.length
      && (text[segmentEnd] === "." || text[segmentEnd] === "!" || text[segmentEnd] === "?")
    ) {
      segmentEnd += 1;
    }

    while (segmentEnd < text.length && /\s/.test(text[segmentEnd] ?? "")) {
      segmentEnd += 1;
    }

    const segment = text.slice(segmentStart, segmentEnd).trim();
    if (segment) {
      segments.push(segment);
    }

    segmentStart = segmentEnd;
    index = segmentEnd;
  }

  const trailingSegment = text.slice(segmentStart).trim();
  if (trailingSegment) {
    segments.push(trailingSegment);
  }

  return segments.length > 0 ? segments : [text];
}

function splitByCharacterWindow(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    const nextOffset = Math.min(text.length, offset + maxChars);
    chunks.push(text.slice(offset, nextOffset).trim());
    offset = nextOffset;
  }

  return chunks.filter(Boolean);
}

function isValidAction(value: unknown): value is ActionType {
  return value === "improve" || value === "summarize" || value === "expand";
}

function isValidContextMode(value: unknown): value is ContextMode {
  return value === "selection" || value === "document";
}

function isValidRequestKind(value: unknown): value is RequestKind {
  return value === "initial" || value === "refine";
}
