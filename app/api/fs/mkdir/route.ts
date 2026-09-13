import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createVaultFolder } from "@/lib/fs/create-folder";
import { normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

function handleError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Failed to create folder";
  if (status === 409) {
    return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
  }
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to create folder", error);
  return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const prefix = normalizeFolderPrefix(body?.prefix);
    await createVaultFolder({ prefix, existOk: false });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
