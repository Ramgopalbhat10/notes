"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SidebarChat } from "@/components/ai-chat/sidebar-chat";
import { FileTree } from "@/components/file-tree";
import { VaultWorkspace } from "@/components/vault-workspace";
import { useToast } from "@/hooks/use-toast";
import { useTreeStore, type SelectByPathResult } from "@/stores/tree";

function LeftSidebar() {
  return <FileTree />;
}

function RightSidebar() {
  return <SidebarChat />;
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodePathSegments(segments: readonly string[] | undefined): string | null {
  if (!segments || segments.length === 0) {
    return null;
  }
  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

function RouteSynchronizer() {
  const params = useParams<{ path?: string[] }>();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const routePath = useMemo(() => decodePathSegments(params?.path), [params]);
  const selectionOrigin = useTreeStore((state) => state.selectionOrigin);
  const acknowledgeSelectionOrigin = useTreeStore((state) => state.acknowledgeSelectionOrigin);
  const selectedSlug = useTreeStore((state) => {
    const id = state.selectedId;
    if (!id) {
      return null;
    }
    const slug = state.idToSlug[id];
    return slug ?? id;
  });
  const selectByPath = useTreeStore((state) => state.selectByPath);
  const initialized = useTreeStore((state) => state.initialized);
  const manifestVersion = useTreeStore(
    (state) => state.manifestMetadata?.checksum
      ?? state.manifestMetadata?.generatedAt
      ?? `nodes:${Object.keys(state.nodes).length}`,
  );
  const routeTarget = useTreeStore((state) => state.routeTarget);

  const lastAppliedRef = useRef<{ path: string | null; version: string } | null>(null);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const key = { path: routePath, version: manifestVersion ?? "" };
    if (
      lastAppliedRef.current &&
      lastAppliedRef.current.path === key.path &&
      lastAppliedRef.current.version === key.version
    ) {
      return;
    }
    const result: SelectByPathResult = selectByPath(routePath ?? null);
    if (result.status !== "pending") {
      lastAppliedRef.current = key;
    }
  }, [initialized, manifestVersion, routePath, selectByPath]);

  const routeToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (!routeTarget) {
      routeToastRef.current = null;
      return;
    }
    const key = `${routeTarget.status}:${routeTarget.path}`;
    if (routeToastRef.current === key) {
      return;
    }
    routeToastRef.current = key;
    if (routeTarget.status === "missing") {
      toast({
        title: "File not found",
        description: `The path "${routeTarget.path}" was not found. Try refreshing the tree.`,
        variant: "destructive",
      });
    } else if (routeTarget.status === "folder-empty") {
      toast({
        title: "Folder is empty",
        description: `Folder "${routeTarget.path.replace(/\/$/, "")}" does not contain any files yet.`,
      });
    }
  }, [routeTarget, toast]);

  const targetPath = useMemo(() => {
    if (!selectedSlug) {
      return "/files";
    }
    const withoutTrailing = selectedSlug.replace(/\/$/, "");
    if (!withoutTrailing) {
      return "/files";
    }
    return `/files/${encodePath(withoutTrailing)}`;
  }, [selectedSlug]);

  useEffect(() => {
    if (!selectionOrigin) {
      return;
    }
    if (selectionOrigin === "user" && targetPath !== pathname) {
      router.push(targetPath);
    }
    acknowledgeSelectionOrigin();
  }, [selectionOrigin, acknowledgeSelectionOrigin, router, targetPath, pathname]);

  return null;
}

export default function FilesPage() {
  const [header, setHeader] = useState<ReactNode | null>(null);

  return (
    <>
      <RouteSynchronizer />
      <AppShell left={<LeftSidebar />} right={<RightSidebar />} header={header}>
        {({ toggleRight }) => (
          <VaultWorkspace onHeaderChange={setHeader} onToggleRight={toggleRight} />
        )}
      </AppShell>
    </>
  );
}
