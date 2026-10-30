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

describe("isValidTag", () => {
  it("accepts a tag of 32 characters and a tag with surrounding spaces", () => {
    expect(isValidTag("a".repeat(32))).toBe(true);
    expect(isValidTag("  news  ")).toBe(true);
  });
  it("rejects 33 characters, internal whitespace, and empty-after-trim tags", () => {
    expect(isValidTag("a".repeat(33))).toBe(false);
    expect(isValidTag("breaking news")).toBe(false);
    expect(isValidTag("")).toBe(false);
    expect(isValidTag("   ")).toBe(false);
  });
  it("rejects a long run of internal whitespace quickly", () => {
    const start = Date.now();
    expect(isValidTag(`a${" ".repeat(100000)}b`)).toBe(false);
    expect(isValidTag(`${" ".repeat(100000)}x`)).toBe(true);
    expect(Date.now() - start).toBeLessThan(1000);
  });
  it("treats Unicode NEXT LINE (U+0085) as whitespace", () => {
    expect(isValidTag("news\u0085tech")).toBe(false);
    expect(isValidTag("\u0085")).toBe(false);
    expect(isValidTag("\u0085news\u0085")).toBe(true);
  });
});

describe("normalizeTags", () => {
  it("trims and lower-cases", () => {
    expect(normalizeTags(["  News ", "TECH"])).toEqual(["news", "tech"]);
  });
  it("deduplicates across case and spaces, keeping first-occurrence order", () => {
    expect(normalizeTags(["b", " A", "B ", "a", "c"])).toEqual(["b", "a", "c"]);
  });
  it("trims U+0085 at the edges", () => {
    expect(normalizeTags(["\u0085News\u0085", "news"])).toEqual(["news"]);
  });
  it("returns an empty array for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});
