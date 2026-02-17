import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeEtag } from "./etag.ts";

describe("normalizeEtag", () => {
  it("should return null for null", () => {
    assert.strictEqual(normalizeEtag(null), null);
  });

  it("should return null for undefined", () => {
    assert.strictEqual(normalizeEtag(undefined), null);
  });

  it("should return null for empty string", () => {
    // Current implementation: if (!value) return null. So "" -> null.
    assert.strictEqual(normalizeEtag(""), null);
  });

  it("should return original string if no quotes or W/", () => {
    assert.strictEqual(normalizeEtag("foo"), "foo");
  });

  it("should strip double quotes", () => {
    assert.strictEqual(normalizeEtag('"foo"'), "foo");
  });

  it("should strip weak tag prefix W/", () => {
    assert.strictEqual(normalizeEtag("W/foo"), "foo");
  });

  it("should strip weak tag prefix W/ and quotes", () => {
    assert.strictEqual(normalizeEtag('W/"foo"'), "foo");
  });

  it("should handle case insensitive W/", () => {
    assert.strictEqual(normalizeEtag('w/"foo"'), "foo");
  });
});
