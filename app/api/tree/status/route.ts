import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { loadLatestManifest } from "@/lib/manifest-store";

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    return NextResponse.json({ error: "Tree manifest unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    {
      jobId: null,
      status: "completed",
      updatedAt: manifestRecord.updatedAt,
      etag: manifestRecord.etag ?? null,
      metadata: manifestRecord.manifest.metadata,
      error: null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
