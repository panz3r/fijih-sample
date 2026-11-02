import { describe, expect, it } from "vitest";
import { MAX_TAG_LENGTH, isValidBookmarkUrl, normalizeTags, normalizeUrl, sortByCreatedDesc } from "./index.js";

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
  it("trims and lower-cases", () => {
    expect(normalizeTags([" Work ", "READING"])).toEqual(["work", "reading"]);
  });

  it("deduplicates after case folding, keeping first occurrence order", () => {
    expect(normalizeTags(["A", "b", "a", " a ", "B"])).toEqual(["a", "b"]);
    expect(normalizeTags(["A", "a", " a "])).toEqual(["a"]);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });

  it("measures the length after trimming and before lower-casing", () => {
    const tag = "İ".repeat(32);
    expect(normalizeTags([`  ${tag}  `])).toEqual([tag.toLowerCase()]);
    expect(normalizeTags(["İ".repeat(33)])).toBeNull();
  });

  it("accepts 32 characters and rejects 33", () => {
    expect(MAX_TAG_LENGTH).toBe(32);
    expect(normalizeTags(["x".repeat(32)])).toEqual(["x".repeat(32)]);
    expect(normalizeTags(["x".repeat(33)])).toBeNull();
  });

  it("measures length after trimming", () => {
    expect(normalizeTags([`  ${"x".repeat(32)}  `])).toEqual(["x".repeat(32)]);
  });

  it("rejects inner whitespace", () => {
    expect(normalizeTags(["two words"])).toBeNull();
    expect(normalizeTags(["tab\tbed"])).toBeNull();
  });

  it("rejects tags that are empty after trimming", () => {
    expect(normalizeTags([""])).toBeNull();
    expect(normalizeTags(["  "])).toBeNull();
  });

  it("rejects input that is not an array of strings", () => {
    expect(normalizeTags("work")).toBeNull();
    expect(normalizeTags([1])).toBeNull();
    expect(normalizeTags(null)).toBeNull();
  });
});
