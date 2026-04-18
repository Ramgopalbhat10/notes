import { NextRequest, NextResponse } from "next/server";
import { auth, getAuthBypassSession } from "@/lib/auth";
import { AUTH_BYPASS_ENABLED } from "@/lib/auth/config";
import { toNextJsHandler } from "better-auth/next-js";

const handler = auth ? toNextJsHandler(auth.handler) : null;

function handleBypassedAuthRequest(request: NextRequest) {
  const authPath = request.nextUrl.pathname.slice("/api/auth".length);

  if (authPath === "/get-session") {
    return NextResponse.json(getAuthBypassSession());
  }

  if (authPath === "/sign-out") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.redirect(new URL("/files", request.url));
}

export async function GET(request: NextRequest) {
  if (AUTH_BYPASS_ENABLED) {
    return handleBypassedAuthRequest(request);
  }

  if (!handler) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 500 });
  }

  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  if (AUTH_BYPASS_ENABLED) {
    return handleBypassedAuthRequest(request);
  }

  if (!handler) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 500 });
  }

  return handler.POST(request);
}
