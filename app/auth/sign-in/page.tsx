import { redirect } from "next/navigation";
import { AUTH_BYPASS_ENABLED } from "@/lib/auth/config";
import { SignInPageClient } from "./sign-in-page-client";

export default function SignInPage() {
  if (AUTH_BYPASS_ENABLED) {
    redirect("/files");
  }

  return <SignInPageClient />;
}
