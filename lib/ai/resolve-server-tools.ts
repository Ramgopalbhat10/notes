import type { Tool } from "ai";
import { createExtractTool, searchTool } from "@parallel-web/ai-sdk-tools";

import { createVaultTools, type VaultToolContext } from "@/lib/ai/vault-tools";
import type { EnabledTools } from "@/lib/ai/tools";

export type { EnabledTools };

export type ResolveServerToolsOptions = {
  authorId?: string | null;
};

const EXTRACT_DEADLINE_MS = 35_000;
const EXTRACT_TIMEOUT_MESSAGE =
  "web_extract timed out after 35s. The page may be JavaScript-heavy, login-walled, or slow. Try web_search or a static/export URL.";
const DEFAULT_EXTRACT_OBJECTIVE =
  "Extract the main visible page content as markdown, including titles, links, lists, and tables.";

const webExtractTool = boundExtractTool(
  createExtractTool({
    full_content: { max_chars_per_result: 24_000 },
    excerpts: { max_chars_per_result: 12_000 },
    fetch_policy: {
      max_age_seconds: 600,
      timeout_seconds: 25,
      disable_cache_fallback: false,
    },
    description:
      "Fetch a specific public URL as markdown, including JavaScript-rendered pages when Parallel can execute them. Always pass an objective describing what to extract. Login walls, bot blocks, and some SPAs can still return empty results.",
  }),
);

function boundExtractTool(tool: Tool): Tool {
  const execute = tool.execute;
  if (!execute) {
    return tool;
  }

  return {
    ...tool,
    execute: async (input, options) => {
      const timeout = AbortSignal.timeout(EXTRACT_DEADLINE_MS);
      const abortSignal = options.abortSignal ? AbortSignal.any([options.abortSignal, timeout]) : timeout;
      const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
      const objective =
        typeof record.objective === "string" && record.objective.trim()
          ? record.objective.trim()
          : DEFAULT_EXTRACT_OBJECTIVE;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          execute({ ...record, objective }, { ...options, abortSignal }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(EXTRACT_TIMEOUT_MESSAGE)), EXTRACT_DEADLINE_MS);
          }),
        ]);
      } catch (error) {
        if (timeout.aborted || (error instanceof Error && error.message === EXTRACT_TIMEOUT_MESSAGE)) {
          throw new Error(EXTRACT_TIMEOUT_MESSAGE);
        }
        throw error;
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    },
  };
}

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
