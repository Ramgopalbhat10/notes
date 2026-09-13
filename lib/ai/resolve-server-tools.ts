import type { Tool } from "ai";
import { extractTool, searchTool } from "@parallel-web/ai-sdk-tools";

import { createVaultTools, type VaultToolContext } from "@/lib/ai/vault-tools";
import type { EnabledTools } from "@/lib/ai/tools";

export type { EnabledTools };

export type ResolveServerToolsOptions = {
  authorId?: string | null;
};

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
    tools.web_extract = extractTool;
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
