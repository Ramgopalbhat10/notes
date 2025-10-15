import { NextRequest, NextResponse } from "next/server";

import { startRefreshJobAndWait } from "@/lib/tree-refresh";

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

function buildStatusUrl(request: NextRequest, jobId: string): string {
  const url = new URL(request.url);
  url.pathname = "/api/tree/status";
  url.search = `id=${jobId}`;
  url.hash = "";
  return url.toString();
}

export async function POST(request: NextRequest) {
  const authError = authorize(request);
  if (authError) {
    return authError;
  }

  // Run synchronously to completion; avoids background task cancellation in Workers
  const job = await startRefreshJobAndWait();
  const statusUrl = buildStatusUrl(request, job.id);

  return NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata ?? null,
      etag: job.etag ?? null,
      error: job.error ?? null,
      statusUrl,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
