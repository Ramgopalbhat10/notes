import type { UIMessage } from "ai";

import { MAX_EXCERPT_CHARS } from "./types";

type DocumentSummary = {
  excerpt: string;
  digest: string | null;
};

const DOCUMENT_SUMMARY_CACHE_LIMIT = 12;
const documentSummaryCache = new Map<string, DocumentSummary>();

export function getDocumentSummary(value: string): DocumentSummary {
  const cached = documentSummaryCache.get(value);
  if (cached) {
    documentSummaryCache.delete(value);
    documentSummaryCache.set(value, cached);
    return cached;
  }

  let digest: string | null = null;
  let excerpt = "";

  if (value) {
    const normalized = value.replace(/\r\n/g, "\n");
    excerpt = normalized.length <= MAX_EXCERPT_CHARS
      ? normalized
      : normalized.slice(0, MAX_EXCERPT_CHARS);

    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    digest = `${value.length}:${(hash >>> 0).toString(16)}`;
  }

  const summary = { excerpt, digest };
  documentSummaryCache.set(value, summary);
  if (documentSummaryCache.size > DOCUMENT_SUMMARY_CACHE_LIMIT) {
    const oldestKey = documentSummaryCache.keys().next().value;
    if (oldestKey !== undefined) {
      documentSummaryCache.delete(oldestKey);
    }
  }

  return summary;
}

export function messageToPlainText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (part.type === "reasoning" && part.text) {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
