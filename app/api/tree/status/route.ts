import { NextRequest, NextResponse } from "next/server";

import { getRefreshJob } from "@/lib/tree-refresh";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  const job = getRefreshJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata ?? null,
      etag: job.etag ?? null,
      error: job.error ?? null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
