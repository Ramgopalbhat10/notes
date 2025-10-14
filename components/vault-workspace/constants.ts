import {
  ArrowUpRight,
  ListChecks,
  Sparkles,
  Wand2,
} from "lucide-react";

import type { AiActionDefinition, AiActionType } from "./types";

export const AI_ACTIONS: AiActionDefinition[] = [
  {
    value: "improve",
    label: "Improve Writing",
    icon: Wand2,
  },
  {
    value: "summarize",
    label: "Summarize",
    icon: ListChecks,
  },
  {
    value: "expand",
    label: "Expand",
    icon: ArrowUpRight,
  },
];

export const ACTION_LABEL: Record<AiActionType, string> = {
  improve: "Improve Writing",
  summarize: "Summarize",
  expand: "Expand",
};

export const AI_ICON = Sparkles;
