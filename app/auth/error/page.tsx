"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border p-6 shadow-sm bg-background space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground">Only the configured GitHub account is allowed to use this app.</p>
          <p className="text-xs text-muted-foreground">Reach out to admin for access.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={async () => {
              await authClient.signOut({ fetchOptions: { onSuccess: () => { router.push("/auth/sign-in"); } } });
            }}
          >
            Sign out
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/sign-in">Back to sign-in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
