import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  const displayName = user?.name || user?.email || "";
  const avatarImage = user?.image ?? undefined;
  const avatarFallback = (displayName || "?").slice(0, 1).toUpperCase();

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
        <Avatar className="h-9 w-9">
          {avatarImage ? <AvatarImage src={avatarImage} alt={displayName || "Profile"} /> : null}
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
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
