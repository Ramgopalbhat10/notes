import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";

// Mock dependencies
const requireApiUserMock = mock.fn(() => {
    return Promise.resolve({ ok: true, session: {} });
});

// Mocking both alias and relative path just in case
mock.module("@/lib/auth", {
  namedExports: {
    requireApiUser: requireApiUserMock,
  },
});

// Try to mock the file cache as well
const getCachedFileMock = mock.fn(async () => {
  const error = new Error("Sensitive internal path: /var/www/secret");
  Object.assign(error, { status: 400 });
  throw error;
});

mock.module("@/lib/file-cache", {
  namedExports: {
    getCachedFile: getCachedFileMock,
  },
});

describe("Security Vulnerability Reproduction", () => {
  it("should NOT leak sensitive error message in 400 response", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/fs/file?key=test.md");
    const response = await GET(request);

    assert.strictEqual(response.status, 400);
    const data = await response.json();

    // Assert that the error message is generic "Bad Request"
    assert.strictEqual(data.error, "Bad Request");
    console.log("Verified: Response contains generic error message.");
  });
});
