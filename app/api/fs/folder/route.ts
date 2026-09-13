import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { deleteVaultFolder } from "@/lib/fs/delete-folder";
import { normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

function handleError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Failed to delete folder";
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to delete folder", error);
  return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
}

export async function DELETE(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const prefix = normalizeFolderPrefix(body?.prefix);
    const recursive = Boolean(body?.recursive);
    await deleteVaultFolder({ prefix, recursive });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
