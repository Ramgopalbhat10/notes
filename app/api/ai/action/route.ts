import { NextRequest } from "next/server";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

type ActionType = "improve" | "summarize" | "expand";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_INPUT_CHARS = 8_000;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    ensureEnv();

    const ip = getClientIdentifier(request);
    if (!consumeRateLimit(ip)) {
      return json({ error: "Too many requests. Please wait and try again." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const action = isValidAction((body as Record<string, unknown>).action)
      ? ((body as Record<string, unknown>).action as ActionType)
      : null;
    const content = safeString((body as Record<string, unknown>).content);
    const selection = safeString((body as Record<string, unknown>).selection);

    if (!action) {
      return json({ error: "Unsupported action" }, { status: 400 });
    }

    const sourceText = selection || content;
    if (!sourceText.trim()) {
      return json({ error: "Nothing to process" }, { status: 400 });
    }

    const { text: truncatedText, truncated } = clampText(sourceText, MAX_INPUT_CHARS);

    const modelName = process.env.AI_MODEL?.trim() || "llama3-70b-8192";
    const result = await streamText({
      model: groq(modelName),
      system: buildSystemPrompt(action),
      prompt: buildUserPrompt({
        action,
        content: truncatedText,
        truncated,
        selectionProvided: Boolean(selection),
      }),
      temperature: action === "summarize" ? 0.2 : 0.7,
    });

    return result.toTextStreamResponse({
      headers: {
        "x-ai-input-truncated": truncated ? "1" : "0",
        "x-ai-action": action,
      },
    });
  } catch (error) {
    console.error("/api/ai/action failed", error);
    return json({ error: "Failed to process AI action" }, { status: 500 });
  }
}

function ensureEnv() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
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

function consumeRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function clampText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, maxChars), truncated: true };
}

function buildSystemPrompt(action: ActionType): string {
  const base =
    "You are an expert writing assistant working with Markdown content. Maintain the author's voice, keep formatting intact, and respond with clean Markdown only.";
  const actionHints: Record<ActionType, string> = {
    improve: "Improve clarity and flow without changing meaning.",
    summarize: "Provide a concise summary in 3-5 bullet points.",
    expand: "Expand the ideas with richer detail while staying on topic.",
  };

  return `${base} ${actionHints[action]} If the prompt notes that the text was truncated, briefly acknowledge that limitation.`;
}

function buildUserPrompt({
  action,
  content,
  truncated,
  selectionProvided,
}: {
  action: ActionType;
  content: string;
  truncated: boolean;
  selectionProvided: boolean;
}): string {
  const contextLine = selectionProvided
    ? "The user highlighted the following selection:"
    : "The user shared the full document:";
  const truncationLine = truncated
    ? "NOTE: Content was truncated to fit the model context."
    : "";
  const actionLine: Record<ActionType, string> = {
    improve: "Revise the text for clarity and tone while preserving intent.",
    summarize: "Summarize the text. Avoid adding new information.",
    expand: "Expand upon the text with additional helpful details.",
  };

  return [
    actionLine[action],
    truncationLine,
    contextLine,
    "" + content,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isValidAction(value: unknown): value is ActionType {
  return value === "improve" || value === "summarize" || value === "expand";
}

function json(data: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}
