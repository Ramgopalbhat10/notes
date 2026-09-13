import type { LucideIcon } from "lucide-react";
import { FolderPen, Globe } from "lucide-react";

export type SearchProviderId = "parallel";

export type SearchProvider = {
  id: SearchProviderId;
  name: string;
  description: string;
};

export type ToolProvider = {
  id: string;
  name: string;
  description: string;
};

export type ChatToolId = "web-search" | "vault";

export type ChatToolToggle = "submenu" | "inline";

export type ChatToolDefinition = {
  id: ChatToolId;
  name: string;
  description: string;
  icon: LucideIcon;
  providers: ToolProvider[];
  toggle?: ChatToolToggle;
};

export const SEARCH_PROVIDERS: SearchProvider[] = [
  {
    id: "parallel",
    name: "Parallel",
    description: "LLM-optimized web search via Parallel AI",
  },
];

export const VAULT_NATIVE_PROVIDER: ToolProvider = {
  id: "native",
  name: "Notes vault",
  description: "Read, create, edit, move, and delete notes and folders",
};

export const CHAT_TOOLS: ChatToolDefinition[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for current information",
    icon: Globe,
    providers: SEARCH_PROVIDERS,
    toggle: "submenu",
  },
  {
    id: "vault",
    name: "Vault",
    description: "Read, create, edit, move, and delete notes and folders",
    icon: FolderPen,
    providers: [VAULT_NATIVE_PROVIDER],
    toggle: "inline",
  },
];

export type EnabledTools = Record<string, string[]>;
