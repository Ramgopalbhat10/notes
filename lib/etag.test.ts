import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeEtag, parseIfNoneMatch } from "./etag.ts";

describe("normalizeEtag", () => {
  it("returns null for null/undefined", () => {
    assert.strictEqual(normalizeEtag(null), null);
    assert.strictEqual(normalizeEtag(undefined), null);
    // It seems normalizeEtag implementation doesn't check for empty string specifically but 'if (!value)' handles it
    assert.strictEqual(normalizeEtag(""), null);
  });

  it("removes quotes", () => {
    assert.strictEqual(normalizeEtag('"foo"'), "foo");
    assert.strictEqual(normalizeEtag('foo"'), "foo");
    assert.strictEqual(normalizeEtag('"foo'), "foo");
  });

  it("removes weak prefix", () => {
    assert.strictEqual(normalizeEtag('W/"foo"'), "foo");
    assert.strictEqual(normalizeEtag("W/foo"), "foo");
  });

  it("handles combination", () => {
    assert.strictEqual(normalizeEtag('W/"foo"'), "foo");
  });
});

describe("parseIfNoneMatch", () => {
  it("returns empty array for null/empty header", () => {
    assert.deepStrictEqual(parseIfNoneMatch(null), []);
    assert.deepStrictEqual(parseIfNoneMatch(""), []);
  });

  it("parses single etag", () => {
    assert.deepStrictEqual(parseIfNoneMatch('"foo"'), ["foo"]);
  });

  it("parses multiple etags", () => {
    assert.deepStrictEqual(parseIfNoneMatch('"foo", "bar"'), ["foo", "bar"]);
  });

  it("handles whitespace", () => {
    assert.deepStrictEqual(parseIfNoneMatch(' "foo" , "bar" '), ["foo", "bar"]);
  });

  it("normalizes etags", () => {
    assert.deepStrictEqual(parseIfNoneMatch('W/"foo", "bar"'), ["foo", "bar"]);
  });

  it("filters empty segments", () => {
    assert.deepStrictEqual(parseIfNoneMatch('"foo", , "bar"'), ["foo", "bar"]);
  });
});
