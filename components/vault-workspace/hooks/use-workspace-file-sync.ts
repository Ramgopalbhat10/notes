import { useEffect } from "react";

type UseWorkspaceFileSyncOptions = {
  selectedPath: string | null;
  fileKey: string | null;
  loadFile: (key: string | null) => Promise<void>;
  reset: () => void;
  dirty: boolean;
};

export function useWorkspaceFileSync({
  selectedPath,
  fileKey,
  loadFile,
  reset,
  dirty,
}: UseWorkspaceFileSyncOptions): void {
  useEffect(() => {
    if (selectedPath) {
      if (selectedPath !== fileKey) {
        void loadFile(selectedPath);
      }
    } else {
      reset();
    }
  }, [fileKey, loadFile, reset, selectedPath]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);
}
