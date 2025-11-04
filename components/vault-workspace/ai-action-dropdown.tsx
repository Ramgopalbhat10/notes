import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import { AI_ACTIONS, AI_ICON } from "./constants";
import type { AiActionType } from "./types";

export function AiActionDropdown({
  disabled,
  busy,
  onSelect,
}: {
  disabled: boolean;
  busy: boolean;
  onSelect: (action: AiActionType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40"
          disabled={disabled}
          aria-label="AI actions menu"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AI_ICON className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {AI_ACTIONS.map((item) => (
          <DropdownMenuItem
            key={item.value}
            className="flex items-center gap-2"
            onSelect={() => {
              onSelect(item.value);
            }}
          >
            <item.icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
