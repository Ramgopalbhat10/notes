import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { normalizeFileKey } from "@/lib/fs/fs-validation";
import { getCachedFile } from "@/lib/fs/file-cache";
import { parseIfNoneMatch } from "@/lib/etag";
import { saveMarkdownFile } from "@/lib/fs/save-markdown";
import { deleteMarkdownFile } from "@/lib/fs/delete-file";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

const CACHE_CONTROL_HEADER = "private, no-cache, must-revalidate";

function handleS3Error(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Unexpected S3 error";
  if (status === 404) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (status === 409) {
    return NextResponse.json({ error: "ETag mismatch" }, { status: 409 });
  }
  if (status === 412) {
    return NextResponse.json({ error: "Precondition failed" }, { status: 412 });
  }
  if (status === 400) {
    console.error("S3 Bad Request", error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
  console.error("S3 operation failed", error);
  return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
}

function sessionUserId(session: unknown): string | null {
  if (!session || typeof session !== "object" || !("user" in session)) {
    return null;
  }
  const user = (session as { user?: { id?: unknown } }).user;
  return typeof user?.id === "string" ? user.id : null;
}

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const url = new URL(request.url);
    const key = normalizeFileKey(url.searchParams.get("key"));
    const cached = await getCachedFile(key);
    const normalizedEtag = cached.etag ?? null;
    const lastModifiedDate = cached.lastModified ? new Date(cached.lastModified) : null;
    const lastModifiedHttp = lastModifiedDate ? lastModifiedDate.toUTCString() : undefined;

    const incomingEtags = parseIfNoneMatch(request.headers.get("if-none-match"));
    const ifModifiedSinceRaw = request.headers.get("if-modified-since");
    const ifModifiedSince = ifModifiedSinceRaw ? new Date(ifModifiedSinceRaw) : null;
    const hasValidIfModifiedSince = Boolean(ifModifiedSince && !Number.isNaN(ifModifiedSince.getTime()));

    const etagMatches = normalizedEtag ? incomingEtags.includes(normalizedEtag) : false;
    const modifiedSinceMatches =
      hasValidIfModifiedSince && lastModifiedDate ? lastModifiedDate <= ifModifiedSince! : false;

    if (etagMatches || modifiedSinceMatches) {
      const headers = new Headers();
      headers.set("Cache-Control", CACHE_CONTROL_HEADER);
      if (cached.etag) {
        headers.set("ETag", `"${cached.etag}"`);
      }
      if (lastModifiedHttp) {
        headers.set("Last-Modified", lastModifiedHttp);
      }
      headers.set("X-File-Cache", cached.cacheStatus.toUpperCase());
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }

    const headers = new Headers();
    headers.set("Cache-Control", CACHE_CONTROL_HEADER);
    if (cached.etag) {
      headers.set("ETag", `"${cached.etag}"`);
    }
    if (lastModifiedDate) {
      headers.set("Last-Modified", lastModifiedDate.toUTCString());
    }
    headers.set("X-File-Cache", cached.cacheStatus.toUpperCase());

    return NextResponse.json(
      {
        key,
        content: cached.content,
        etag: cached.etag ?? undefined,
        lastModified: cached.lastModified ?? undefined,
      },
      { headers },
    );
  } catch (error) {
    return handleS3Error(error);
  }
}

export async function PUT(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const key = normalizeFileKey(body?.key);
    const content = typeof body?.content === "string" ? body.content : "";
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    const { etag: newEtag } = await saveMarkdownFile({
      key,
      content,
      ifMatchEtag,
      authorId: sessionUserId(authRes.session),
    });

    return NextResponse.json({
      etag: newEtag,
    });
  } catch (error) {
    return handleS3Error(error);
  }
}

export async function DELETE(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const key = normalizeFileKey(body?.key);
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    await deleteMarkdownFile({ key, ifMatchEtag });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleS3Error(error);
  }
}
