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
  it("trims, lower-cases, and deduplicates, keeping first-occurrence order", () => {
    expect(normalizeTags([" News ", "news", "Tech"])).toEqual(["news", "tech"]);
  });
  it("returns an empty list for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
  it("accepts a 32-character tag and rejects a 33-character one", () => {
    expect(normalizeTags(["a".repeat(32)])).toEqual(["a".repeat(32)]);
    expect(normalizeTags(["a".repeat(33)])).toBeNull();
    expect(normalizeTags([` ${"a".repeat(32)} `])).toEqual(["a".repeat(32)]);
  });
  it("counts code points, not UTF-16 units", () => {
    expect(normalizeTags(["😀".repeat(32)])).not.toBeNull();
    expect(normalizeTags(["😀".repeat(33)])).toBeNull();
  });
  it("measures length before lower-casing", () => {
    expect(normalizeTags(["\u0130".repeat(32)])).toEqual(["\u0130".toLowerCase().repeat(32)]);
    expect(normalizeTags(["\u0130".repeat(33)])).toBeNull();
  });
  it("rejects inner whitespace and empty tags", () => {
    expect(normalizeTags(["two words"])).toBeNull();
    expect(normalizeTags(["a\tb"])).toBeNull();
    expect(normalizeTags(["  "])).toBeNull();
  });
  it("does not mutate its input", () => {
    const input = [" A ", "a"];
    normalizeTags(input);
    expect(input).toEqual([" A ", "a"]);
  });
});
