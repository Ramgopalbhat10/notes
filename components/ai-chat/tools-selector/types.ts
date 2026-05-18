import type { ChatToolDefinition, EnabledTools } from "@/lib/ai/tools";

export type ToolsSelectorProps = {
  tools: ChatToolDefinition[];
  enabledTools: EnabledTools;
  onToggleProvider: (toolId: string, providerId: string, enabled: boolean) => void;
  portalContainer: HTMLElement | null;
};
