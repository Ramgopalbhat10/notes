import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { refreshFileTree } from "@/lib/tree-refresh";

export const runtime = "nodejs";

const REFRESH_SECRET = process.env.TREE_REFRESH_SECRET;
let warnedAboutMissingSecret = false;

function authorize(request: NextRequest): NextResponse | null {
  if (!REFRESH_SECRET) {
    if (!warnedAboutMissingSecret) {
      console.warn("TREE_REFRESH_SECRET is not set; /api/tree/refresh is unsecured.");
      warnedAboutMissingSecret = true;
    }
    return null;
  }

  const authorizationHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : undefined;
  const headerToken = request.headers.get("x-refresh-secret") ?? bearerToken;

  if (headerToken !== REFRESH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  const authError = authorize(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await refreshFileTree();

    return NextResponse.json(
      {
        status: "completed",
        metadata: result.manifest.metadata,
        etag: result.etag ?? null,
        updatedAt: result.updatedAt,
        statusUrl: "/api/tree/status",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Tree refresh failed", error);
    const message = error instanceof Error ? error.message : "Failed to refresh tree manifest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
