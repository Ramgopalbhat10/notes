import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { basename } from "./paths";

describe("basename", () => {
  it("should return the filename from a path", () => {
    assert.equal(basename("file.txt"), "file.txt");
    assert.equal(basename("path/to/file.txt"), "file.txt");
  });

  it("should handle trailing slashes", () => {
    assert.equal(basename("folder/"), "folder");
    assert.equal(basename("path/to/folder/"), "folder");
  });

  it("should handle paths without slashes", () => {
    assert.equal(basename("filename"), "filename");
  });

  it("should handle root paths", () => {
    assert.equal(basename("/"), "");
    assert.equal(basename("/absolute/path"), "path");
  });

  it("should handle empty strings", () => {
    assert.equal(basename(""), "");
  });

  it("should handle strings with only slashes", () => {
    assert.equal(basename("//"), "");
    assert.equal(basename("///"), "");
  });
});
