"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ModalState } from "./types";

export type ActionDialogProps = {
  modal: ModalState | null;
  input: string;
  error: string | null;
  submitting: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  formatPathLabel: (path: string | null | undefined) => string;
};

export function ActionDialog({
  modal,
  input,
  error,
  submitting,
  onInputChange,
  onSubmit,
  onClose,
  formatPathLabel,
}: ActionDialogProps) {
  const inputClasses = "rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";
  const cancelButtonClasses = "w-full rounded-lg border border-border/70 bg-background text-foreground transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto";
  const primaryButtonClasses = "w-full rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto";

  const renderContent = () => {
    if (!modal) {
      return null;
    }

    switch (modal.type) {
      case "create-folder": {
        const parentLabel = formatPathLabel(modal.parentId);
        return (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New Folder</DialogTitle>
              <DialogDescription>
                Create a folder inside <span className="font-medium">{parentLabel}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="Folder name"
                autoFocus
                className={inputClasses}
              />
              <p className="text-xs text-muted-foreground">Keep names short and descriptive.</p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className={cancelButtonClasses}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                {submitting ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </form>
        );
      }
      case "create-file": {
        const parentLabel = formatPathLabel(modal.parentId);
        return (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New File</DialogTitle>
              <DialogDescription>
                Create a markdown file inside <span className="font-medium">{parentLabel}</span>. The
                <code className="mx-1 rounded bg-muted px-1">.md</code>
                extension is added automatically if missing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="File name"
                autoFocus
                className={inputClasses}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className={cancelButtonClasses}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                {submitting ? "Creating..." : "Create File"}
              </Button>
            </DialogFooter>
          </form>
        );
      }
      case "rename": {
        return (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename {modal.isFolder ? "Folder" : "File"}</DialogTitle>
              <DialogDescription>
                Current path: <span className="font-medium">{formatPathLabel(modal.path)}</span>
                {!modal.isFolder ? " (extension will be appended automatically)." : "."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder={modal.isFolder ? "Folder name" : "File name"}
                autoFocus
                className={inputClasses}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className={cancelButtonClasses}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                {submitting ? "Renaming..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        );
      }
      case "move": {
        return (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Move {modal.isFolder ? "Folder" : "File"}</DialogTitle>
              <DialogDescription>
                Current path: <span className="font-medium">{formatPathLabel(modal.path)}</span>. Enter a relative folder
                path (e.g. <code className="rounded bg-muted px-1">projects/client</code>) or leave blank for root.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="Destination folder"
                autoFocus
                className={inputClasses}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className={cancelButtonClasses}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                {submitting ? "Moving..." : "Move"}
              </Button>
            </DialogFooter>
          </form>
        );
      }
      case "delete": {
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Delete {modal.isFolder ? "Folder" : "File"}</DialogTitle>
              <DialogDescription>
                This will permanently remove <span className="font-medium">{modal.name}</span> ({formatPathLabel(modal.path)}).
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className={cancelButtonClasses}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onSubmit()}
                disabled={submitting}
                className={primaryButtonClasses}
              >
                {submitting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Dialog open={modal !== null} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
    >
      {modal ? (
        <DialogContent
          className="w-[92vw] max-w-md rounded-lg border border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur-md transition-all duration-150 sm:w-full animate-in fade-in-0 zoom-in-95"
        >
          {renderContent()}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
