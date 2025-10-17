"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function SignInPage() {
  const handleSignIn = async () => {
    await authClient.signIn.social({ 
      provider: "github", 
      callbackURL: "/files",
      errorCallbackURL: "/auth/error",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-sm bg-background">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">Use your GitHub account to continue.</p>
        <div className="mt-4">
          <Button className="w-full" onClick={handleSignIn}>
            Continue with GitHub
          </Button>
        </div>
        <Separator className="my-6" />
        <p className="text-xs text-muted-foreground">
          Having trouble? {" "}
          <Link href="https://github.com/settings/developers" className="underline">
            Check your GitHub app setup
          </Link>
        </p>
      </div>
    </div>
  );
}
