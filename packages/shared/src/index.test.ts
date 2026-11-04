import { describe, expect, it } from "vitest";
import { isValidBookmarkUrl, normalizeTags, normalizeUrl, sortByCreatedDesc } from "./index.js";

describe("isValidBookmarkUrl", () => {
  it("accepts http and https", () => {
    expect(isValidBookmarkUrl("https://example.com")).toBe(true);
    expect(isValidBookmarkUrl("http://example.com/a?b=1")).toBe(true);
  });
  it("rejects other protocols and garbage", () => {
    expect(isValidBookmarkUrl("ftp://example.com")).toBe(false);
    expect(isValidBookmarkUrl("javascript:alert(1)")).toBe(false);
    expect(isValidBookmarkUrl("not a url")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("lower-cases the host and strips default port, fragment, and bare trailing slash", () => {
    expect(normalizeUrl("HTTPS://Example.COM:443/#top")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path/");
    expect(normalizeUrl("https://example.com/?q=1")).toBe("https://example.com/?q=1");
  });
});

describe("sortByCreatedDesc", () => {
  it("orders newest first without mutating the input", () => {
    const input = [{ createdAt: "2026-01-01" }, { createdAt: "2026-03-01" }, { createdAt: "2026-02-01" }];
    const out = sortByCreatedDesc(input);
    expect(out.map((i) => i.createdAt)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
    expect(input[0].createdAt).toBe("2026-01-01");
  });
});

describe("normalizeTags", () => {
  it("defaults to an empty list", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags([])).toEqual([]);
  });
  it("trims and lower-cases", () => {
    expect(normalizeTags(["  Work ", "READING"])).toEqual(["work", "reading"]);
  });
  it("removes duplicates after normalisation, keeping the first position", () => {
    expect(normalizeTags([" Work", "work "])).toEqual(["work"]);
    expect(normalizeTags(["b", "a", "B", "c", "a"])).toEqual(["b", "a", "c"]);
  });
  it("accepts 32 characters and rejects 33", () => {
    expect(normalizeTags(["a".repeat(32)])).toEqual(["a".repeat(32)]);
    expect(normalizeTags(["a".repeat(33)])).toBeNull();
    expect(normalizeTags([` ${"a".repeat(32)} `])).toEqual(["a".repeat(32)]);
  });
  it("rejects a tag with inner whitespace", () => {
    expect(normalizeTags(["to read"])).toBeNull();
    expect(normalizeTags(["a\tb"])).toBeNull();
  });
  it("rejects an empty tag", () => {
    expect(normalizeTags([""])).toBeNull();
    expect(normalizeTags(["ok", "   "])).toBeNull();
  });
  it("rejects a malformed value", () => {
    expect(normalizeTags("work")).toBeNull();
    expect(normalizeTags(null)).toBeNull();
    expect(normalizeTags({})).toBeNull();
    expect(normalizeTags(["ok", 1])).toBeNull();
    expect(normalizeTags([null])).toBeNull();
  });
});
