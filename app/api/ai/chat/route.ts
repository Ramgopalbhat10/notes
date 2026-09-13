import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type ModelMessage,
  type SystemModelMessage,
  type UIMessage,
  type Tool,
} from "ai";

import { DEFAULT_CHAT_MODEL, parseModelId } from "@/lib/ai/models";
import { clampText } from "@/lib/ai/text-utils";
import { redactSecrets, sanitizeContext } from "@/lib/ai/redact";
import { resolveServerTools, type EnabledTools } from "@/lib/ai/resolve-server-tools";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/fs/s3";
import { s3BodyToString } from "@/lib/fs/s3-body";
import { normalizeFileKey } from "@/lib/fs/fs-validation";

export const maxDuration = 60;

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
  tools?: EnabledTools | null;
};

type ParsedChatRequest = {
  messages: UIMessage[];
  file: ChatRequestBody["file"];
  model: string | null;
  tools: EnabledTools | null;
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
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { messages: rawMessages, file: rawFile, model: requestedModel, tools: enabledTools } = await parseRequest(request);

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: "At least one message is required" }, { status: 400 });
    }

    const messages = clampMessages(rawMessages, MAX_MESSAGES);

    const fileContext = await resolveFileContext(rawFile);

    const parallelEnabled = Boolean(enabledTools?.["web-search"]?.includes("parallel"));
    const vaultEnabled = Boolean(enabledTools?.vault?.includes("native"));

    const systemPrompt = buildSystemPrompt({
      fileKey: fileContext.key,
      hasContext: Boolean(fileContext.excerpt),
      truncated: fileContext.truncated,
      warning: fileContext.warning,
      parallelEnabled,
      vaultEnabled,
    });

    const modelName = resolveModel(requestedModel);

    const convertedMessages = await convertToModelMessages(messages);
    const contextMessage = buildContextMessage({
      fileKey: fileContext.key,
      excerpt: fileContext.excerpt,
      truncated: fileContext.truncated,
      source: fileContext.source,
    });

    const orderedMessages: ModelMessage[] = contextMessage
      ? [contextMessage, ...convertedMessages]
      : convertedMessages;

    const resolvedTools = resolveServerTools(enabledTools, {
      authorId:
        authRes.session?.user && typeof authRes.session.user === "object" && "id" in authRes.session.user
          && typeof authRes.session.user.id === "string"
          ? authRes.session.user.id
          : null,
    });
    const hasTools = resolvedTools && Object.keys(resolvedTools).length > 0;

    const result = await streamText({
      model: modelName,
      system: systemPrompt,
      messages: orderedMessages,
      temperature: 0.4,
      tools: (resolvedTools ?? {}) as Record<string, Tool>,
      ...(hasTools
        ? { toolChoice: "auto" as const, stopWhen: stepCountIs(12) }
        : {}),
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        "x-ai-context-truncated": fileContext.truncated ? "1" : "0",
        "x-ai-context-source": fileContext.source,
      },
    });
  } catch (error) {
    console.error("/api/ai/chat failed", error);
    return NextResponse.json({ error: normalizeError(error) }, { status: 500 });
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
  const rawTools = requestBody.tools;
  const tools: EnabledTools | null =
    typeof rawTools === "object" && rawTools !== null && !Array.isArray(rawTools) ? rawTools : null;
  return { messages, file, model, tools } satisfies ParsedChatRequest;
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
  const { text, truncated } = clampText(redacted, MAX_CONTEXT_CHARS, { trailingEllipsis: true });

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
  parallelEnabled,
  vaultEnabled,
}: {
  fileKey: string | null;
  hasContext: boolean;
  truncated: boolean;
  warning?: string;
  parallelEnabled: boolean;
  vaultEnabled: boolean;
}): string {
  const base =
    "You are an expert writing assistant working inside a Markdown knowledge base. Answer as a collaborative teammate: be concise, reference the provided context, and keep formatting clean.";

  const contextLine = hasContext
    ? `You have access to the current file${fileKey ? ` (${fileKey})` : ""}. Ground your answers in that file. If the excerpt does not contain the answer, say so rather than guessing.`
    : "No file context was provided; ask clarifying questions when needed.";

  const parentFolder = fileKey?.includes("/") ? fileKey.slice(0, fileKey.lastIndexOf("/") + 1) : "";
  const pathHint = fileKey
    ? `When creating a new file without a path, put it in ${parentFolder || "the vault root"} and pick a slug filename.`
    : "When creating a new file without a path, put it in the vault root with a slug filename.";

  const truncationLine = truncated
    ? "The file excerpt was truncated to fit the token budget. Avoid speculating beyond the visible content."
    : "";

  const warningLine = warning ? `Context warning: ${warning}` : "";

  const parallelLine = parallelEnabled
    ? "Web tools are enabled. Use web_extract for a known URL. Use web_search for open-ended lookup."
    : "";

  const vaultLine = vaultEnabled
    ? [
        "Vault tools are enabled. You may list, read, create, edit, move, delete, and roll back markdown notes and folders.",
        "Prefer list_dir or read_file before mutating an unclear path.",
        "Prefer edit_file for partial changes. Do not write_file a full replacement when read_file returned truncated: true.",
        "Only delete when the user named the target; set confirm_path equal to path. Never delete the vault root.",
        "After mutations, tell the user the paths you changed.",
        pathHint,
      ].join(" ")
    : "Vault tools are not enabled. You cannot create, edit, move, or delete vault files. Do not claim you wrote to disk.";

  return [base, contextLine, truncationLine, warningLine, parallelLine, vaultLine].filter(Boolean).join("\n");
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

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected server error";
}
