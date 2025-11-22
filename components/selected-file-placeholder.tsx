import { cn } from "@/lib/utils";

export function SelectedFilePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 pt-4 md:pt-6 px-4 md:px-0", className)}>
      <h1 className="text-xl font-semibold">Select a file</h1>
      <p className="text-sm text-muted-foreground">
        Choose a markdown note from the left sidebar to view it here.
      </p>
    </div>
  );
}
