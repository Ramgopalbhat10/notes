import { NextRequest, NextResponse } from "next/server";
import { auth, isAllowedUser } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const bypass =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/auth/sign-in");

  if (bypass) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
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
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
