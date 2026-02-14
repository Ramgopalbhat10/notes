import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  convertToModelMessages,
  streamText,
  type ModelMessage,
  type SystemModelMessage,
  type UIMessage,
} from "ai";

import { DEFAULT_CHAT_MODEL, parseModelId } from "@/lib/ai/models";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { s3BodyToString } from "@/lib/s3-body";
import { normalizeFileKey } from "@/lib/fs-validation";

export const maxDuration = 30;

const MAX_CONTEXT_CHARS = 6_000;
const MAX_MESSAGES = 24;

type ChatRequestBody = {
  messages?: UIMessage[];
  file?: {
    key?: string | null;
    contentDigest?: string | null;
    excerpt?: string | null;
  } | null;
  model?: string | null;
};

type ParsedChatRequest = {
  messages: UIMessage[];
  file: ChatRequestBody["file"];
  model: string | null;
};

type FileContext = {
  key: string | null;
  excerpt: string | null;
  truncated: boolean;
  source: "provided" | "s3" | "none" | "error";
  warning?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authRes = await requireApiUser(request);
    if (!authRes.ok) {
      return json({ error: authRes.error }, { status: authRes.status });
    }

    const { messages: rawMessages, file: rawFile, model: requestedModel } = await parseRequest(request);

    if (rawMessages.length === 0) {
      return json({ error: "At least one message is required" }, { status: 400 });
    }

    const messages = clampMessages(rawMessages, MAX_MESSAGES);

    const fileContext = await resolveFileContext(rawFile);

    const systemPrompt = buildSystemPrompt({
      fileKey: fileContext.key,
      hasContext: Boolean(fileContext.excerpt),
      truncated: fileContext.truncated,
      warning: fileContext.warning,
    });

    const modelName = resolveModel(requestedModel);

    const convertedMessages = convertToModelMessages(messages);
    const contextMessage = buildContextMessage({
      fileKey: fileContext.key,
      excerpt: fileContext.excerpt,
      truncated: fileContext.truncated,
      source: fileContext.source,
    });

    const orderedMessages: ModelMessage[] = contextMessage
      ? [contextMessage, ...convertedMessages]
      : convertedMessages;

    const result = await streamText({
      model: modelName,
      system: systemPrompt,
      messages: orderedMessages,
      temperature: 0.4,
    });

    return result.toTextStreamResponse({
      headers: {
        "x-ai-context-truncated": fileContext.truncated ? "1" : "0",
        "x-ai-context-source": fileContext.source,
      },
    });
  } catch (error) {
    console.error("/api/ai/chat failed", error);
    return json({ error: normalizeError(error) }, { status: 500 });
  }
}

async function parseRequest(request: NextRequest): Promise<ParsedChatRequest> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }
  const requestBody = body as ChatRequestBody;
  const messages = Array.isArray(requestBody.messages) ? requestBody.messages : [];
  const file = requestBody.file ?? null;
  const rawModel = requestBody.model;
  const model: string | null = typeof rawModel === "string" ? rawModel : null;
  return { messages, file, model } satisfies ParsedChatRequest;
}

function clampMessages(messages: UIMessage[], max: number): UIMessage[] {
  if (messages.length <= max) {
    return messages;
  }
  return messages.slice(-max);
}

function resolveModel(requested: string | null): string {
  const fallback = parseModelId(process.env.AI_CHAT_MODEL) || parseModelId(process.env.AI_MODEL) || DEFAULT_CHAT_MODEL;
  return parseModelId(requested) || fallback;
}

async function resolveFileContext(file: ChatRequestBody["file"]): Promise<FileContext> {
  if (!file) {
    return { key: null, excerpt: null, truncated: false, source: "none" };
  }

  const keyRaw = typeof file.key === "string" ? file.key : null;
  let key: string | null = null;
  if (keyRaw) {
    try {
      key = normalizeFileKey(keyRaw);
    } catch (error) {
      return {
        key: null,
        excerpt: null,
        truncated: false,
        source: "error",
        warning: normalizeError(error),
      };
    }
  }

  let excerpt = typeof file.excerpt === "string" ? file.excerpt : null;
  let source: FileContext["source"] = excerpt ? "provided" : "none";
  let warning: string | undefined;

  if (!excerpt && key) {
    try {
      excerpt = await fetchFileContent(key);
      source = excerpt ? "s3" : "none";
    } catch (error) {
      source = "error";
      warning = normalizeError(error);
    }
  }

  if (!excerpt) {
    return { key, excerpt: null, truncated: false, source, warning };
  }

  const sanitized = sanitizeContext(excerpt);
  const redacted = redactSecrets(sanitized);
  const { text, truncated } = clampText(redacted, MAX_CONTEXT_CHARS);

  return {
    key,
    excerpt: text,
    truncated,
    source,
    warning,
  };
}

async function fetchFileContent(key: string): Promise<string | null> {
  const bucket = getBucket();
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: applyVaultPrefix(key),
  });

  const response = await client.send(command);
  return s3BodyToString(response.Body);
}

function buildSystemPrompt({
  fileKey,
  hasContext,
  truncated,
  warning,
}: {
  fileKey: string | null;
  hasContext: boolean;
  truncated: boolean;
  warning?: string;
}): string {
  const base =
    "You are an expert writing assistant working inside a Markdown knowledge base. Answer as a collaborative teammate: be concise, reference the provided context, and keep formatting clean.";

  const contextLine = hasContext
    ? `You have access to the current file${fileKey ? ` (${fileKey})` : ""}. Ground your answers in that file. If the excerpt does not contain the answer, say so rather than guessing.`
    : "No file context was provided; ask clarifying questions when needed.";

  const truncationLine = truncated
    ? "The file excerpt was truncated to fit the token budget. Avoid speculating beyond the visible content."
    : "";

  const warningLine = warning ? `Context warning: ${warning}` : "";

  return [base, contextLine, truncationLine, warningLine].filter(Boolean).join("\n");
}

function buildContextMessage({
  fileKey,
  excerpt,
  truncated,
  source,
}: {
  fileKey: string | null;
  excerpt: string | null;
  truncated: boolean;
  source: FileContext["source"];
}): SystemModelMessage | null {
  if (!excerpt) {
    return null;
  }

  const headerParts = [
    fileKey ? `File path: ${fileKey}` : "File path: (unknown)",
    truncated ? "Excerpt truncated to protect token budget." : null,
    source === "provided" ? "Context source: provided by client." : null,
  ].filter(Boolean);

  const content = [
    headerParts.join("\n"),
    "--- File Excerpt Start ---",
    excerpt,
    "--- File Excerpt End ---",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    role: "system",
    content,
  };
}

function sanitizeContext(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function redactSecrets(text: string): string {
  const sensitive = /(password|secret|token|api[_-]?key|access[_-]?key)/i;
  return text
    .split("\n")
    .map((line) => {
      if (!sensitive.test(line)) {
        return line;
      }
      sensitive.lastIndex = 0;
      const eqIndex = line.indexOf("=");
      const colonIndex = line.indexOf(":");
      const splitIndex = eqIndex >= 0 && (colonIndex === -1 || eqIndex < colonIndex) ? eqIndex : colonIndex;
      if (splitIndex === -1) {
        return "[REDACTED]";
      }
      const prefix = line.slice(0, splitIndex + 1).trimEnd();
      return `${prefix} [REDACTED]`;
    })
    .join("\n");
}

function clampText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return { text: `${text.slice(0, maxChars)}\n…`, truncated: true };
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected server error";
}

function json(data: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}
