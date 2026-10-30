import { describe, expect, it } from "vitest";
import { isValidBookmarkUrl, isValidTag, normalizeTags, normalizeUrl, sortByCreatedDesc } from "./index.js";

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
  it("trims, lower-cases, and drops tags that are empty after trimming", () => {
    expect(normalizeTags(["  News ", "TECH", "", "   "])).toEqual(["news", "tech"]);
  });
  it("deduplicates after normalization keeping first occurrence order", () => {
    expect(normalizeTags(["b", "A", " B ", "a", "c"])).toEqual(["b", "a", "c"]);
  });
  it("returns an empty array for no tags", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe("isValidTag", () => {
  it("accepts 32 characters and rejects 33", () => {
    expect(isValidTag("a".repeat(32))).toBe(true);
    expect(isValidTag("a".repeat(33))).toBe(false);
  });
  it("checks length after trimming", () => {
    expect(isValidTag(`  ${"a".repeat(32)}  `)).toBe(true);
  });
  it("rejects inner space and tab but allows padding", () => {
    expect(isValidTag("two words")).toBe(false);
    expect(isValidTag("two\twords")).toBe(false);
    expect(isValidTag("  padded  ")).toBe(true);
  });
});
