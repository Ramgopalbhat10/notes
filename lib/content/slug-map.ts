import { isFolderNode, type FileTreeManifest } from "@/lib/file-tree-manifest";

export function slugifySegment(segment: string, stripExtension: boolean): string {
  let value = segment;
  if (stripExtension) {
    value = value.replace(/\.md$/i, "");
  }
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

export function buildSlugFromPath(path: string, isFile: boolean): string {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!trimmed) {
    return "";
  }

  const segments = trimmed.split("/");
  const slugSegments = segments.map((segment, index) => {
    const isFileSegment = isFile && index === segments.length - 1;
    return slugifySegment(segment, isFileSegment);
  });

  let slug = slugSegments.join("/");
  if (!isFile && slug) {
    slug = `${slug}/`;
  }
  return slug;
}

export function buildSlugToIdMap(manifest: FileTreeManifest): Record<string, string> {
  const slugToId: Record<string, string> = {};
  const maxCollisionAttempts = 100;

  for (const node of manifest.nodes) {
    const isFile = !isFolderNode(node);
    const baseSlug = buildSlugFromPath(node.path, isFile);
    if (!baseSlug) {
      continue;
    }

    let finalSlug = baseSlug;
    let counter = 2;
    while (slugToId[finalSlug] && slugToId[finalSlug] !== node.id && counter <= maxCollisionAttempts) {
      if (!isFile) {
        const folderSlug = baseSlug.replace(/\/$/, "");
        finalSlug = `${folderSlug}-${counter}/`;
      } else {
        finalSlug = `${baseSlug}-${counter}`;
      }
      counter += 1;
    }

    slugToId[finalSlug] = node.id;
  }

  return slugToId;
}
