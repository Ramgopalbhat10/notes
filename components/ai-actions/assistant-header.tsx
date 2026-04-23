"use client";

import { Copy, Eye, EyeOff, Trash2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AI_ACTIONS } from "@/components/vault-workspace/constants";
import type { AiActionType } from "@/components/vault-workspace/types";

import type { AiAssistantStatus } from "./types";

type StatusTone = "muted" | "info" | "error";

type AssistantHeaderProps = {
  activeAction: AiActionType | null;
  actionsDisabled: boolean;
  onSelectAction: (action: AiActionType) => void;
  showActionCluster: boolean;
  compareAvailable: boolean;
  compareMode: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
  canCopy: boolean;
  onCopy: () => void;
  onClear: () => void;
  status: AiAssistantStatus;
  statusMessage: string | null;
};

// Premium header for the assistant sidebar. Three primary actions sit in a
// segmented control so the active action reads as a clear selection; the
// icon-only action cluster to the right uses ghost buttons with tooltips and
// separates destructive clear from benign copy/compare. Status is rendered in
// a single line below so users can scan result metadata without distractions.
export function AssistantHeader({
  activeAction,
  actionsDisabled,
  onSelectAction,
  showActionCluster,
  compareAvailable,
  compareMode,
  canCompare,
  onToggleCompare,
  canCopy,
  onCopy,
  onClear,
  status,
  statusMessage,
}: AssistantHeaderProps) {
  const statusTone: StatusTone =
    status === "error" ? "error" : status === "streaming" ? "info" : "muted";
  const statusToneClass =
    statusTone === "error"
      ? "text-destructive"
      : statusTone === "info"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div className="border-b border-border/50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="AI actions"
          className={cn(
            "inline-flex items-center rounded-md border border-border/70 bg-muted/40 p-0.5 shadow-[inset_0_0_0_1px_transparent]",
          )}
        >
          {AI_ACTIONS.map((action) => {
            const isActive = action.value === activeAction;
            return (
              <SegmentedActionButton
                key={action.value}
                icon={action.icon}
                label={action.label}
                isActive={isActive}
                disabled={actionsDisabled}
                onClick={() => onSelectAction(action.value)}
              />
            );
          })}
        </div>

        {showActionCluster ? (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-0.5 rounded-md border border-transparent">
              {compareAvailable ? (
                <IconClusterButton
                  label={compareMode ? "Hide original" : "Compare with original"}
                  icon={compareMode ? EyeOff : Eye}
                  active={compareMode}
                  disabled={!canCompare}
                  onClick={onToggleCompare}
                />
              ) : null}
              <IconClusterButton
                label="Copy AI draft"
                icon={Copy}
                disabled={!canCopy}
                onClick={onCopy}
              />
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border/80" />
              <IconClusterButton
                label="Clear assistant draft"
                icon={Trash2}
                onClick={onClear}
                destructive
              />
            </div>
          </TooltipProvider>
        ) : null}
      </div>

      {statusMessage ? (
        <div
          className={cn(
            "mt-1.5 flex min-h-[1rem] items-center gap-2 text-[11px] leading-4",
            statusToneClass,
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {status === "streaming" ? (
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
              />
            ) : null}
            {statusMessage}
          </span>
        </div>
      ) : null}
    </div>
  );
}

type SegmentedActionButtonProps = {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
};

function SegmentedActionButton({
  icon: Icon,
  label,
  isActive,
  disabled,
  onClick,
}: SegmentedActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      className={cn(
        "group relative inline-flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        isActive
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}

type IconClusterButtonProps = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
};

function IconClusterButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  destructive,
}: IconClusterButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 text-muted-foreground hover:text-foreground",
            active && "bg-accent text-foreground",
            destructive && "hover:text-destructive",
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
