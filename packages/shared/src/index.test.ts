import { describe, expect, it } from "vitest";
import { InvalidTagError, isValidBookmarkUrl, normalizeTags, normalizeUrl, sortByCreatedDesc } from "./index.js";

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
  it("defaults a missing value to an empty array", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags([])).toEqual([]);
  });
  it("trims, lower-cases, and deduplicates keeping first occurrence order", () => {
    expect(normalizeTags(["Work", " work ", "Read"])).toEqual(["work", "read"]);
    expect(normalizeTags(["b", "a", "B"])).toEqual(["b", "a"]);
    expect(normalizeTags(["  work "])).toEqual(["work"]);
  });
  it("accepts 32 code points and rejects 33", () => {
    expect(normalizeTags(["a".repeat(32)])).toEqual(["a".repeat(32)]);
    expect(() => normalizeTags(["a".repeat(33)])).toThrow(InvalidTagError);
    expect(normalizeTags(["😀".repeat(32)])).toHaveLength(1);
    expect(() => normalizeTags(["😀".repeat(33)])).toThrow(InvalidTagError);
  });
  it("rejects internal whitespace, empty, and whitespace-only tags", () => {
    expect(() => normalizeTags(["read later"])).toThrow(InvalidTagError);
    expect(() => normalizeTags([""])).toThrow(InvalidTagError);
    expect(() => normalizeTags(["   "])).toThrow(InvalidTagError);
  });
  it("rejects a non-array value, null, and a non-string element", () => {
    expect(() => normalizeTags("work")).toThrow(InvalidTagError);
    expect(() => normalizeTags(5)).toThrow(InvalidTagError);
    expect(() => normalizeTags(null)).toThrow(InvalidTagError);
    expect(() => normalizeTags(["a", 1])).toThrow(InvalidTagError);
  });
  it("validates every tag even when a duplicate precedes an invalid one", () => {
    expect(() => normalizeTags(["a", "a", "b c"])).toThrow(InvalidTagError);
  });
});
