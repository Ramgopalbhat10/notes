"use client";

import { Button } from "@/components/ui/button";

type ChatErrorBannerProps = {
  error: Error | null | undefined;
  onDismiss: () => void;
};

export function ChatErrorBanner({ error, onDismiss }: ChatErrorBannerProps) {
  if (!error) {
    return null;
  }
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 mx-3 mt-2 text-xs text-destructive">
      <div className="flex items-center justify-between gap-3">
        <span>{error.message}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
