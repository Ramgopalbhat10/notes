"use client";

export type PreviewSelectionAnchor = {
  contextBefore: string;
  contextAfter: string;
};

const PREVIEW_SELECTION_CONTEXT_CHARS = 64;

type MarkdownTextProjection = {
  text: string;
  rawIndexByTextIndex: number[];
};

type FenceState = {
  marker: "`" | "~";
  length: number;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export const normalizeAnchorText = normalizeWhitespace;

function appendNormalizedChar(
  projection: MarkdownTextProjection,
  character: string,
  rawIndex: number,
): void {
  if (/\s/.test(character)) {
    const last = projection.text[projection.text.length - 1];
    if (!projection.text || last === " ") {
      return;
    }
    projection.text += " ";
    projection.rawIndexByTextIndex.push(rawIndex);
    return;
  }

  projection.text += character;
  projection.rawIndexByTextIndex.push(rawIndex);
}

function trimProjection(projection: MarkdownTextProjection): void {
  while (projection.text.endsWith(" ")) {
    projection.text = projection.text.slice(0, -1);
    projection.rawIndexByTextIndex.pop();
  }
}

function splitLinesWithEndings(text: string): string[] {
  if (!text) {
    return [];
  }

  const lines: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "\n") {
      continue;
    }
    lines.push(text.slice(start, index + 1));
    start = index + 1;
  }

  if (start < text.length) {
    lines.push(text.slice(start));
  }

  return lines;
}

function parseFencePrefix(line: string): FenceState | null {
  let indent = 0;
  while (indent < line.length && line[indent] === " ") {
    indent += 1;
  }
  if (indent > 3) {
    return null;
  }

  const marker = line[indent];
  if (marker !== "`" && marker !== "~") {
    return null;
  }

  let end = indent;
  while (end < line.length && line[end] === marker) {
    end += 1;
  }

  const length = end - indent;
  if (length < 3) {
    return null;
  }

  return { marker, length };
}

function isFenceCloser(line: string, activeFence: FenceState): boolean {
  const prefix = parseFencePrefix(line);
  if (!prefix || prefix.marker !== activeFence.marker || prefix.length < activeFence.length) {
    return false;
  }

  let indent = 0;
  while (indent < line.length && line[indent] === " ") {
    indent += 1;
  }
  let index = indent + prefix.length;
  while (index < line.length) {
    const character = line[index];
    if (character !== " " && character !== "\t") {
      return false;
    }
    index += 1;
  }

  return true;
}

function getLineContentStart(line: string): number {
  let index = 0;

  while (index < line.length && index < 3 && line[index] === " ") {
    index += 1;
  }

  while (line[index] === ">") {
    index += 1;
    while (line[index] === " ") {
      index += 1;
    }
  }

  let headingEnd = index;
  while (line[headingEnd] === "#") {
    headingEnd += 1;
  }
  if (headingEnd > index && headingEnd - index <= 6 && line[headingEnd] === " ") {
    index = headingEnd + 1;
  }

  const listMatch = line.slice(index).match(/^(?:[*+-]|\d+[.)])\s+/);
  if (listMatch) {
    index += listMatch[0].length;
    const taskMatch = line.slice(index).match(/^\[(?: |x|X)\]\s+/);
    if (taskMatch) {
      index += taskMatch[0].length;
    }
  }

  return index;
}

function findClosingBracket(text: string, start: number, openChar: string, closeChar: string): number {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === openChar) {
      depth += 1;
      continue;
    }
    if (character === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function skipLinkDestination(text: string, start: number): number {
  if (text[start] !== "(") {
    return start;
  }

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return start;
}

function projectInlineMarkdown(
  text: string,
  rawOffset: number,
  projection: MarkdownTextProjection,
  options?: { preserveLiteralMarkdown?: boolean },
): void {
  const preserveLiteralMarkdown = options?.preserveLiteralMarkdown ?? false;

  for (let index = 0; index < text.length;) {
    const rawIndex = rawOffset + index;
    const character = text[index];

    if (character === "\\") {
      if (index + 1 < text.length) {
        appendNormalizedChar(projection, text[index + 1], rawOffset + index + 1);
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (!preserveLiteralMarkdown && character === "!" && text[index + 1] === "[") {
      const altEnd = findClosingBracket(text, index + 1, "[", "]");
      if (altEnd > index + 1) {
        projectInlineMarkdown(text.slice(index + 2, altEnd), rawOffset + index + 2, projection);
        index = altEnd + 1;
        if (text[index] === "(") {
          const destinationEnd = skipLinkDestination(text, index);
          if (destinationEnd > index) {
            index = destinationEnd;
          }
        }
        continue;
      }
    }

    if (!preserveLiteralMarkdown && character === "[") {
      const labelEnd = findClosingBracket(text, index, "[", "]");
      if (labelEnd > index) {
        const nextCharacter = text[labelEnd + 1];
        if (nextCharacter === "(" || nextCharacter === "[") {
          projectInlineMarkdown(text.slice(index + 1, labelEnd), rawOffset + index + 1, projection);
          index = labelEnd + 1;
          if (text[index] === "(") {
            const destinationEnd = skipLinkDestination(text, index);
            if (destinationEnd > index) {
              index = destinationEnd;
            }
          } else if (text[index] === "[") {
            const referenceEnd = findClosingBracket(text, index, "[", "]");
            if (referenceEnd > index) {
              index = referenceEnd + 1;
            }
          }
          continue;
        }
      }
    }

    if (!preserveLiteralMarkdown && character === "<") {
      const closeIndex = text.indexOf(">", index + 1);
      if (closeIndex > index) {
        const inner = text.slice(index + 1, closeIndex);
        if (inner.includes("@") || inner.startsWith("http://") || inner.startsWith("https://")) {
          projectInlineMarkdown(inner, rawOffset + index + 1, projection, { preserveLiteralMarkdown: true });
          index = closeIndex + 1;
          continue;
        }
      }
    }

    if (!preserveLiteralMarkdown && (character === "*" || character === "_" || character === "~" || character === "`")) {
      index += 1;
      continue;
    }

    appendNormalizedChar(projection, character, rawIndex);
    index += 1;
  }
}

function buildMarkdownTextProjection(markdown: string): MarkdownTextProjection {
  const projection: MarkdownTextProjection = {
    text: "",
    rawIndexByTextIndex: [],
  };
  let activeFence: FenceState | null = null;
  let rawOffset = 0;

  for (const rawLine of splitLinesWithEndings(markdown)) {
    const hasLineFeed = rawLine.endsWith("\n");
    const lineEndingLength = hasLineFeed ? 1 : 0;
    const line = hasLineFeed ? rawLine.slice(0, -1) : rawLine;

    if (activeFence) {
      if (isFenceCloser(line, activeFence)) {
        activeFence = null;
        rawOffset += rawLine.length;
        continue;
      }

      projectInlineMarkdown(line, rawOffset, projection, { preserveLiteralMarkdown: true });
      if (hasLineFeed) {
        appendNormalizedChar(projection, " ", rawOffset + line.length);
      }
      rawOffset += rawLine.length;
      continue;
    }

    const fencePrefix = parseFencePrefix(line);
    if (fencePrefix) {
      activeFence = fencePrefix;
      rawOffset += rawLine.length;
      continue;
    }

    const contentStart = getLineContentStart(line);
    projectInlineMarkdown(line.slice(contentStart), rawOffset + contentStart, projection);
    if (hasLineFeed) {
      appendNormalizedChar(projection, " ", rawOffset + line.length);
    }
    rawOffset += rawLine.length;
  }

  trimProjection(projection);
  return projection;
}

function expandSelectionEnd(markdown: string, end: number): number {
  let next = end;

  while (next < markdown.length && /[*_~`]/.test(markdown[next] ?? "")) {
    next += 1;
  }

  if (markdown[next] === "]" && markdown[next + 1] === "(") {
    const destinationEnd = skipLinkDestination(markdown, next + 1);
    if (destinationEnd > next + 1) {
      next = destinationEnd;
    }
  }

  return next;
}

function commonPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let matched = 0;
  while (matched < limit && left[matched] === right[matched]) {
    matched += 1;
  }
  return matched;
}

function commonSuffixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let matched = 0;
  while (matched < limit && left[left.length - matched - 1] === right[right.length - matched - 1]) {
    matched += 1;
  }
  return matched;
}

export function buildPreviewSelectionAnchor(
  fullText: string,
  start: number,
  end: number,
): PreviewSelectionAnchor {
  return {
    contextBefore: normalizeWhitespace(fullText.slice(Math.max(0, start - PREVIEW_SELECTION_CONTEXT_CHARS), start)),
    contextAfter: normalizeWhitespace(fullText.slice(end, Math.min(fullText.length, end + PREVIEW_SELECTION_CONTEXT_CHARS))),
  };
}

export function buildSelectionIdentity({
  contextMode,
  selectionText,
  selectionBlockIds,
  previewAnchor,
}: {
  contextMode: "selection" | "document";
  selectionText: string;
  selectionBlockIds?: string[];
  previewAnchor?: PreviewSelectionAnchor | null;
}): string {
  if (contextMode !== "selection") {
    return "document";
  }

  const normalizedSelection = normalizeWhitespace(selectionText);
  if (selectionBlockIds && selectionBlockIds.length > 0) {
    return `blocks:${selectionBlockIds.join(",")}`;
  }

  if (previewAnchor) {
    return [
      "preview",
      normalizeWhitespace(previewAnchor.contextBefore),
      normalizedSelection,
      normalizeWhitespace(previewAnchor.contextAfter),
    ].join("::");
  }

  return `text:${normalizedSelection}`;
}

export function resolvePreviewSelectionRange(
  markdown: string,
  selectionText: string,
  previewAnchor: PreviewSelectionAnchor,
): { start: number; end: number } | null {
  const normalizedSelection = normalizeWhitespace(selectionText);
  if (!normalizedSelection) {
    return null;
  }

  const beforeContext = normalizeWhitespace(previewAnchor.contextBefore);
  const afterContext = normalizeWhitespace(previewAnchor.contextAfter);
  const projection = buildMarkdownTextProjection(markdown);
  const candidates: Array<{ start: number; score: number }> = [];

  let searchIndex = 0;
  while (searchIndex <= projection.text.length) {
    const matchIndex = projection.text.indexOf(normalizedSelection, searchIndex);
    if (matchIndex < 0) {
      break;
    }

    const matchEnd = matchIndex + normalizedSelection.length;
    const prefix = projection.text.slice(Math.max(0, matchIndex - beforeContext.length), matchIndex);
    const suffix = projection.text.slice(matchEnd, matchEnd + afterContext.length);
    const score = commonSuffixLength(prefix, beforeContext) + commonPrefixLength(suffix, afterContext);
    candidates.push({ start: matchIndex, score });
    searchIndex = matchIndex + 1;
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score || left.start - right.start);
  if (candidates.length > 1 && candidates[0]?.score === candidates[1]?.score && candidates[0]?.score === 0) {
    return null;
  }

  const best = candidates[0];
  if (!best) {
    return null;
  }

  const rawStart = projection.rawIndexByTextIndex[best.start];
  const rawEndBase = projection.rawIndexByTextIndex[best.start + normalizedSelection.length - 1];
  if (rawStart === undefined || rawEndBase === undefined) {
    return null;
  }

  return {
    start: rawStart,
    end: expandSelectionEnd(markdown, rawEndBase + 1),
  };
}
