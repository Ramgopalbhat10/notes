import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { normalizeFileKey } from "@/lib/fs-validation";
import { deleteFileMeta, getFileMeta, setFileMeta } from "@/lib/file-meta";

function invalidRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const url = new URL(request.url);
    const key = normalizeFileKey(url.searchParams.get("key"));
    const meta = await getFileMeta(key);
    return NextResponse.json(meta);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return invalidRequest(message);
  }
}

export async function PUT(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await request.json();
    const key = normalizeFileKey(typeof body?.key === "string" ? body.key : null);

    if (typeof body?.public !== "boolean") {
      return invalidRequest("`public` must be a boolean");
    }

    const isPublic = body.public;
    const success = isPublic ? await setFileMeta(key, { public: true }) : await deleteFileMeta(key);
    if (!success) {
      return invalidRequest("Failed to update metadata", 500);
    }

    return NextResponse.json({ public: isPublic });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return invalidRequest("Request body must be valid JSON");
    }
    const message = error instanceof Error ? error.message : "Failed to update metadata";
    return invalidRequest(message);
  }
}
