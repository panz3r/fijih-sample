import { describe, expect, it } from "vitest";
import { InvalidTagError, MAX_TAG_LENGTH, isValidBookmarkUrl, normalizeTags, normalizeUrl, sortByCreatedDesc } from "./index.js";

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
  it("trims, lower-cases, and dedups keeping first occurrence", () => {
    expect(normalizeTags(["  News ", "tech", "NEWS"])).toEqual(["news", "tech"]);
  });
  it("defaults to an empty list", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags([])).toEqual([]);
  });
  it("accepts 32 code points and rejects 33", () => {
    expect(MAX_TAG_LENGTH).toBe(32);
    expect(normalizeTags(["a".repeat(32)])).toEqual(["a".repeat(32)]);
    expect(() => normalizeTags(["a".repeat(33)])).toThrow(InvalidTagError);
    expect(normalizeTags(["😀".repeat(32)])).toHaveLength(1);
    expect(() => normalizeTags(["😀".repeat(33)])).toThrow(InvalidTagError);
  });
  it("rejects inner whitespace, empty-after-trim, non-array, and non-string", () => {
    expect(() => normalizeTags(["two words"])).toThrow("invalid tag");
    expect(() => normalizeTags([""])).toThrow(InvalidTagError);
    expect(() => normalizeTags(["   "])).toThrow(InvalidTagError);
    expect(() => normalizeTags("news")).toThrow(InvalidTagError);
    expect(() => normalizeTags([1])).toThrow(InvalidTagError);
    expect(() => normalizeTags([null])).toThrow(InvalidTagError);
  });
});
