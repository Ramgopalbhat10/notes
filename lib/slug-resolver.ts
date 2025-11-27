import { loadLatestManifest } from "@/lib/manifest-store";
import { isFolderNode, type FileTreeManifest } from "@/lib/file-tree-manifest";

function slugifySegment(segment: string, stripExtension: boolean): string {
  let value = segment;
  if (stripExtension) {
    value = value.replace(/\.md$/i, "");
  }
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function buildSlugFromPath(path: string, isFile: boolean): string {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!trimmed) return "";

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

function buildSlugToIdMap(manifest: FileTreeManifest): Record<string, string> {
  const slugToId: Record<string, string> = {};

  for (const node of manifest.nodes) {
    const isFile = !isFolderNode(node);
    const baseSlug = buildSlugFromPath(node.path, isFile);
    if (!baseSlug) continue;

    let finalSlug = baseSlug;
    let counter = 2;
    while (slugToId[finalSlug] && slugToId[finalSlug] !== node.id) {
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

export async function resolveSlugToKey(slug: string): Promise<string | null> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    return null;
  }

  const slugToId = buildSlugToIdMap(manifestRecord.manifest);

  // Try exact match
  if (slugToId[slug]) {
    return slugToId[slug];
  }

  // Try with trailing slash for folders
  if (!slug.endsWith("/") && slugToId[`${slug}/`]) {
    return slugToId[`${slug}/`];
  }

  return null;
}
