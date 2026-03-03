import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePublicStore } from "@/stores/public";

type SharingState = {
  isPublic: boolean;
  loading: boolean;
  updating: boolean;
  shareUrl: string | null;
};

type ToastFn = (opts: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type UseFileSharingOptions = {
  shareKey: string | null;
  publicUrl: string | null;
  toast: ToastFn;
};

type UseFileSharingResult = {
  sharingState: SharingState | undefined;
  handleTogglePublic: () => void;
  handleCopyPublicLink: () => Promise<void>;
};

export function useFileSharing({
  shareKey,
  publicUrl,
  toast,
}: UseFileSharingOptions): UseFileSharingResult {
  const shareRecord = usePublicStore((state) => (shareKey ? state.records[shareKey] : undefined));
  const loadShareState = usePublicStore((state) => state.load);
  const toggleShareState = usePublicStore((state) => state.toggle);

  useEffect(() => {
    if (shareKey) {
      void loadShareState(shareKey);
    }
  }, [shareKey, loadShareState]);

  const shareRecordPublic = Boolean(shareRecord?.public);
  const shareRecordLoading = Boolean(shareRecord?.loading);
  const shareRecordUpdating = Boolean(shareRecord?.updating);
  const shareRecordHasData = Boolean(shareRecord);

  const sharingState = useMemo(
    () =>
      shareKey
        ? {
            isPublic: shareRecordPublic,
            loading: !shareRecordHasData || shareRecordLoading,
            updating: shareRecordUpdating,
            shareUrl: shareRecordPublic && publicUrl ? publicUrl : null,
          }
        : undefined,
    [shareKey, shareRecordPublic, shareRecordHasData, shareRecordLoading, shareRecordUpdating, publicUrl],
  );

  const lastShareErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shareRecord?.error) {
      lastShareErrorRef.current = null;
      return;
    }
    if (shareRecord.error === lastShareErrorRef.current) {
      return;
    }
    lastShareErrorRef.current = shareRecord.error;
    toast({
      title: "Sharing update failed",
      description: shareRecord.error,
      variant: "destructive",
    });
  }, [shareRecord?.error, toast]);

  const handleTogglePublic = useCallback(() => {
    if (!shareKey) {
      return;
    }
    if (!sharingState || sharingState.loading || sharingState.updating) {
      return;
    }
    const next = !sharingState.isPublic;
    void toggleShareState(shareKey, next).then((success) => {
      if (success) {
        toast({
          title: next ? "Public link enabled" : "Public link disabled",
          description: next && publicUrl ? "Anyone with the link can view this file." : undefined,
        });
      }
    });
  }, [shareKey, sharingState, toggleShareState, toast, publicUrl]);

  const handleCopyPublicLink = useCallback(async () => {
    if (!sharingState?.shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(sharingState.shareUrl);
      toast({
        title: "Public link copied",
        description: "Share it with anyone to give read-only access.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy the public link. Try again.",
        variant: "destructive",
      });
    }
  }, [sharingState?.shareUrl, toast]);

  return {
    sharingState,
    handleTogglePublic,
    handleCopyPublicLink,
  };
}
