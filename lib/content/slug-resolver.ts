import { loadLatestManifest } from "@/lib/cache/manifest-store";

export async function resolveSlugToKey(slug: string): Promise<string | null> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    return null;
  }

  const slugToId = manifestRecord.slugToId;

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
