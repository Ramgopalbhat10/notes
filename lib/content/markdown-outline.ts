export type MarkdownOutlineNode = {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
  children: MarkdownOutlineNode[];
};

export type MarkdownOutlineItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
  parentId: string | null;
};

export type MarkdownOutlineResult = {
  tree: MarkdownOutlineNode[];
  flat: MarkdownOutlineItem[];
  lineToId: Map<number, string>;
};

type HeadingCandidate = {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
};

type ParsedFence = {
  markerChar: "`" | "~";
  markerLength: number;
};

const OUTLINE_CACHE_LIMIT = 12;
const outlineCache = new Map<string, MarkdownOutlineResult>();

const FENCE_OPEN_RE = /^\s{0,3}(`{3,}|~{3,})/;
const SETEXT_UNDERLINE_RE = /^\s{0,3}(={1,}|-{1,})\s{0,}$/;

type ParsedAtxHeading = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

function parseAtxHeading(line: string): ParsedAtxHeading | null {
  let index = 0;
  let indent = 0;
  while (index < line.length && indent < 3 && (line[index] === " " || line[index] === "\t")) {
    index += 1;
    indent += 1;
  }

  let level = 0;

  while (line[index] === "#" && level < 6) {
    index += 1;
    level += 1;
  }

  if (level === 0) {
    return null;
  }

  const separator = line[index];
  if (separator !== " " && separator !== "\t") {
    return null;
  }

  while (index < line.length && (line[index] === " " || line[index] === "\t")) {
    index += 1;
  }

  if (index >= line.length) {
    return null;
  }

  return {
    level: level as 1 | 2 | 3 | 4 | 5 | 6,
    text: line.slice(index),
  };
}

export function buildMarkdownOutline(content: string): MarkdownOutlineResult {
  const cached = outlineCache.get(content);
  if (cached) {
    outlineCache.delete(content);
    outlineCache.set(content, cached);
    return cached;
  }

  const lines = content.split(/\r?\n/);
  const headingCandidates: HeadingCandidate[] = [];
  let fence: ParsedFence | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    const fenceMatch = line.match(FENCE_OPEN_RE);
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1] &&
        fenceMatch[1][0] === fence.markerChar &&
        fenceMatch[1].length >= fence.markerLength
      ) {
        fence = null;
      }
      continue;
    }

    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1];
      fence = {
        markerChar: marker[0] as "`" | "~",
        markerLength: marker.length,
      };
      continue;
    }

    const atxHeading = parseAtxHeading(line);
    if (atxHeading) {
      const text = normalizeHeadingText(atxHeading.text);
      if (text) {
        headingCandidates.push({
          text,
          level: atxHeading.level,
          line: index + 1,
        });
      }
      continue;
    }

    if (!trimmed) {
      continue;
    }

    const nextLine = lines[index + 1];
    if (!nextLine) {
      continue;
    }

    const setextMatch = nextLine.match(SETEXT_UNDERLINE_RE);
    if (!setextMatch?.[1]) {
      continue;
    }

    headingCandidates.push({
      text: trimmed,
      level: setextMatch[1][0] === "=" ? 1 : 2,
      line: index + 1,
    });
    index += 1;
  }

  const slugCount = new Map<string, number>();
  const lineToId = new Map<number, string>();
  const flat: MarkdownOutlineItem[] = [];
  const tree: MarkdownOutlineNode[] = [];
  const nodeStack: MarkdownOutlineNode[] = [];
  const itemStack: MarkdownOutlineItem[] = [];

  for (const heading of headingCandidates) {
    const baseSlug = slugifyHeading(heading.text);
    const nextCount = (slugCount.get(baseSlug) ?? 0) + 1;
    slugCount.set(baseSlug, nextCount);
    const id = nextCount === 1 ? `md-outline-${baseSlug}` : `md-outline-${baseSlug}-${nextCount}`;
    lineToId.set(heading.line, id);

    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1]!.level >= heading.level) {
      nodeStack.pop();
      itemStack.pop();
    }

    const parentItem = itemStack[itemStack.length - 1] ?? null;
    const outlineItem: MarkdownOutlineItem = {
      id,
      text: heading.text,
      level: heading.level,
      line: heading.line,
      parentId: parentItem ? parentItem.id : null,
    };
    flat.push(outlineItem);

    const node: MarkdownOutlineNode = {
      id,
      text: heading.text,
      level: heading.level,
      line: heading.line,
      children: [],
    };

    if (nodeStack.length === 0) {
      tree.push(node);
    } else {
      nodeStack[nodeStack.length - 1]!.children.push(node);
    }

    nodeStack.push(node);
    itemStack.push(outlineItem);
  }

  const result = { tree, flat, lineToId };
  outlineCache.set(content, result);
  if (outlineCache.size > OUTLINE_CACHE_LIMIT) {
    const oldestKey = outlineCache.keys().next().value;
    if (oldestKey) {
      outlineCache.delete(oldestKey);
    }
  }

  return result;
}

function normalizeHeadingText(text: string): string {
  const withoutTrailingHashes = text.replace(/\s#{1,6}\s{0,}$/, "");
  return withoutTrailingHashes.trim();
}

function slugifyHeading(text: string): string {
  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}
