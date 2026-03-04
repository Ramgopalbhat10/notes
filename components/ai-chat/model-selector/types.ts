import type { ComponentType } from "react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";

export type ModelGroup = {
  provider: string;
  models: GatewayLanguageModelOption[];
};

export type ModelFeatureIcon = {
  tag: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};
