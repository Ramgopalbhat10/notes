import type { LucideIcon } from "lucide-react";
import { Globe } from "lucide-react";
import type { Tool } from "ai";
import { searchTool } from "@parallel-web/ai-sdk-tools";

export type SearchProviderId = "parallel";

export type SearchProvider = {
  id: SearchProviderId;
  name: string;
  description: string;
};

export type ChatToolId = "web-search";

export type ChatToolDefinition = {
  id: ChatToolId;
  name: string;
  description: string;
  icon: LucideIcon;
  providers: SearchProvider[];
};

export const SEARCH_PROVIDERS: SearchProvider[] = [
  {
    id: "parallel",
    name: "Parallel",
    description: "LLM-optimized web search via Parallel AI",
  },
];

export const CHAT_TOOLS: ChatToolDefinition[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for current information",
    icon: Globe,
    providers: SEARCH_PROVIDERS,
  },
];

export type EnabledTools = Record<string, string[]>;

export function resolveServerTools(
  enabledTools: EnabledTools | undefined | null,
): Record<string, Tool> | undefined {
  if (!enabledTools || Object.keys(enabledTools).length === 0) {
    return undefined;
  }

  const tools: Record<string, Tool> = {};

  if (enabledTools["web-search"]?.includes("parallel")) {
    tools.web_search = searchTool;
  }

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return tools;
}
