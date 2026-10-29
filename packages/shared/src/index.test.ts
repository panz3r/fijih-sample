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
  it("accepts 32 characters and rejects 33", () => {
    expect(isValidTag("a".repeat(32))).toBe(true);
    expect(isValidTag("a".repeat(33))).toBe(false);
  });
  it("rejects inner whitespace", () => {
    expect(isValidTag("two words")).toBe(false);
    expect(isValidTag("two\twords")).toBe(false);
  });
  it("applies the rules to the trimmed tag", () => {
    expect(isValidTag("  news  ")).toBe(true);
    expect(isValidTag(` ${"a".repeat(32)} `)).toBe(true);
  });
  it("rejects blank tags", () => {
    expect(isValidTag("")).toBe(false);
    expect(isValidTag("   ")).toBe(false);
  });
});

describe("normalizeTags", () => {
  it("trims and lower-cases", () => {
    expect(normalizeTags([" News ", "TECH"])).toEqual(["news", "tech"]);
  });
  it("folds duplicates across case and whitespace, keeping first-occurrence order", () => {
    expect(normalizeTags(["B", "a", "b", " A "])).toEqual(["b", "a"]);
  });
  it("does not mutate the input and maps [] to []", () => {
    const input = [" X ", "x"];
    normalizeTags(input);
    expect(input).toEqual([" X ", "x"]);
    expect(normalizeTags([])).toEqual([]);
  });
});
