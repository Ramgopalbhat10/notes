import type { Tool } from "ai";
import { createExtractTool, searchTool } from "@parallel-web/ai-sdk-tools";

import { createVaultTools, type VaultToolContext } from "@/lib/ai/vault-tools";
import type { EnabledTools } from "@/lib/ai/tools";

export type { EnabledTools };

export type ResolveServerToolsOptions = {
  authorId?: string | null;
};

const webExtractTool = createExtractTool({
  full_content: true,
  excerpts: { max_chars_per_result: 12_000 },
  fetch_policy: {
    max_age_seconds: 600,
    timeout_seconds: 20,
    disable_cache_fallback: false,
  },
  description:
    "Fetch a specific public URL as markdown, including JavaScript-rendered pages when Parallel can execute them. Always pass an objective describing what to extract. Login walls, bot blocks, and some SPAs can still return empty results.",
});

export function resolveServerTools(
  enabledTools: EnabledTools | undefined | null,
  options: ResolveServerToolsOptions = {},
): Record<string, Tool> | undefined {
  if (!enabledTools || Object.keys(enabledTools).length === 0) {
    return undefined;
  }

  const tools: Record<string, Tool> = {};

  if (enabledTools["web-search"]?.includes("parallel")) {
    tools.web_search = searchTool;
    tools.web_extract = webExtractTool;
  }

  if (enabledTools.vault?.includes("native")) {
    const context: VaultToolContext = { authorId: options.authorId ?? null };
    Object.assign(tools, createVaultTools(context));
  }

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return tools;
}
