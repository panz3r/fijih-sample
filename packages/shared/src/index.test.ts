import { describe, expect, it } from "vitest";
import { isValidBookmarkUrl, isValidTag, normalizeTags, normalizeUrl, parseTags, sortByCreatedDesc } from "./index.js";

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
  it("trims, lower-cases, and deduplicates across case and whitespace, keeping order", () => {
    expect(normalizeTags([" News ", "tech", "NEWS", "news", "Tech "])).toEqual(["news", "tech"]);
  });
  it("gives [] for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe("isValidTag", () => {
  it("accepts 32 characters and rejects 33", () => {
    expect(isValidTag("a".repeat(32))).toBe(true);
    expect(isValidTag("a".repeat(33))).toBe(false);
  });
  it("counts Unicode code points, not UTF-16 units", () => {
    const tag = "\u{1F600}".repeat(32);
    expect(tag.length).toBeGreaterThan(32);
    expect(isValidTag(tag)).toBe(true);
    expect(isValidTag("\u{1F600}".repeat(33))).toBe(false);
  });
  it("rejects empty tags and tags with inner whitespace", () => {
    expect(isValidTag("")).toBe(false);
    expect(isValidTag("a b")).toBe(false);
    expect(isValidTag("a\tb")).toBe(false);
  });
});

describe("parseTags", () => {
  it("returns normalised tags", () => {
    expect(parseTags([" A ", "a", "b"])).toEqual(["a", "b"]);
    expect(parseTags([])).toEqual([]);
  });
  it("returns null for wrong shapes and invalid tags", () => {
    expect(parseTags("news")).toBeNull();
    expect(parseTags(null)).toBeNull();
    expect(parseTags(["a", 1])).toBeNull();
    expect(parseTags(["   "])).toBeNull();
    expect(parseTags(["a b"])).toBeNull();
    expect(parseTags(["a".repeat(33)])).toBeNull();
  });
  it("applies the 32-code-point limit to the trimmed tag, not the lower-cased tag", () => {
    const tag = "\u0130".repeat(32);
    expect(tag.toLowerCase()).not.toHaveLength(tag.length);
    expect([...tag.toLowerCase()].length).toBeGreaterThan(32);
    expect(parseTags([tag])).toEqual([tag.toLowerCase()]);
    expect(parseTags([`  ${tag}  `])).toEqual([tag.toLowerCase()]);
    expect(parseTags(["\u0130".repeat(33)])).toBeNull();
  });
});
