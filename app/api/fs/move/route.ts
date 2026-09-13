import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { moveVaultNode } from "@/lib/fs/move-node";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

function handleError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Failed to move object";
  if (status === 404) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  if (status === 409) {
    return NextResponse.json({ error: "Destination already exists" }, { status: 409 });
  }
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to move object", error);
  return NextResponse.json({ error: "Failed to move object" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const fromRaw = body?.fromKey as string | undefined;
    const toRaw = body?.toKey as string | undefined;
    const overwrite = Boolean(body?.overwrite);
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    if (!fromRaw || !toRaw) {
      return NextResponse.json({ error: "fromKey and toKey are required" }, { status: 400 });
    }

    const result = await moveVaultNode({ fromRaw, toRaw, overwrite, ifMatchEtag });
    return NextResponse.json({ etag: result.etag });
  } catch (error) {
    return handleError(error);
  }
}
