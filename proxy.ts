import { NextRequest, NextResponse } from "next/server";
import { getApiSession, isAllowedUser } from "@/lib/auth";
import { AUTH_BYPASS_ENABLED } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/public/file") {
    const key = request.nextUrl.searchParams.get("key");
    if (key) {
      const encoded = key
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const targetPath = encoded ? `/api/public/file/${encoded}` : "/api/public/file";
      return NextResponse.rewrite(new URL(targetPath, request.url));
    }
  }
  const isPwaPublicAsset =
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.svg" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/icon-192x192.png" ||
    pathname === "/icon-512x512.png" ||
    pathname === "/icon-192x192-maskable.png" ||
    pathname === "/icon-512x512-maskable.png";

  const bypass =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    isPwaPublicAsset ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/auth/sign-in") ||
    pathname === "/p" ||
    pathname === "/p/" ||
    pathname.startsWith("/p/");

  if (bypass) {
    return NextResponse.next();
  }

  if (AUTH_BYPASS_ENABLED) {
    return NextResponse.next();
  }

  const session = await getApiSession(request);
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/auth/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!isAllowedUser(session)) {
    if (isApi) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const errorUrl = new URL("/auth/error", request.url);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
