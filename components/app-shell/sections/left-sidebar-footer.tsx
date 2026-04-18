import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsModal } from "@/components/settings";
import { authClient } from "@/lib/auth/client";
import { useWorkspaceLayoutStore } from "@/stores/layout";
import { cn } from "@/lib/utils";

type LeftSidebarFooterProps = {
  footerSurfaceClass: string;
  footerHeightClass: string;
  iconButtonClassName: string;
};

export function LeftSidebarFooter({
  footerSurfaceClass,
  footerHeightClass,
  iconButtonClassName,
}: LeftSidebarFooterProps) {
  const router = useRouter();
  const sessionState = authClient.useSession();
  const user = sessionState.data?.user;
  const [signingOut, setSigningOut] = useState(false);
  const settingsOpen = useWorkspaceLayoutStore((state) => state.settingsOpen);
  const setSettingsOpen = useWorkspaceLayoutStore((state) => state.setSettingsOpen);
  const openSettings = useWorkspaceLayoutStore((state) => state.openSettings);
  const [authBypassEnabled, setAuthBypassEnabled] = useState(false);

  const displayName = user?.name || user?.email || "";
  const avatarImage = user?.image ?? undefined;
  const avatarFallback = (displayName || "?").slice(0, 1).toUpperCase();

  useEffect(() => {
    setAuthBypassEnabled(document.body.dataset.authBypass === "true");
  }, []);

  const handleSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/sign-in");
          },
        },
      });
    } catch (error) {
      console.error("Failed to sign out", error);
      setSigningOut(false);
    }
  }, [router, signingOut]);

  return (
    <>
      <div
        className={cn(
          footerSurfaceClass,
          footerHeightClass,
          "flex w-full items-center justify-between px-3 md:px-4",
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            {avatarImage ? <AvatarImage src={avatarImage} alt={displayName || "Profile"} /> : null}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          {authBypassEnabled ? (
            <HoverCard>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/12 text-amber-300 transition-colors hover:bg-amber-500/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                  aria-label="Auth bypass enabled"
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="start" className="w-72 border-amber-500/20 bg-zinc-950/95">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-amber-200">Auth bypass enabled</p>
                  <p className="text-xs leading-5 text-zinc-300">
                    <span className="font-mono text-amber-100">AUTH_BYPASS=true</span> is active for this session.
                    Authentication and authorization checks are disabled.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-7", iconButtonClassName)}
                onClick={openSettings}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-7", iconButtonClassName)}
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
