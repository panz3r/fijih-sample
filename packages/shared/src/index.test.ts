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
  it("trims, lower-cases, and deduplicates keeping first-appearance order", () => {
    expect(normalizeTags([" Work ", "work", "READ", "Work", "read "])).toEqual(["work", "read"]);
  });
  it("accepts an empty array", () => {
    expect(normalizeTags([])).toEqual([]);
  });
  it("accepts 32 characters and rejects 33", () => {
    expect(normalizeTags(["a".repeat(32)])).toEqual(["a".repeat(32)]);
    expect(normalizeTags(["a".repeat(33)])).toBeNull();
  });
  it("counts Unicode code points, not UTF-16 units", () => {
    expect(normalizeTags(["😀".repeat(32)])).toHaveLength(1);
    expect(normalizeTags(["😀".repeat(33)])).toBeNull();
  });
  it("rejects an oversized tag without spreading it", () => {
    expect(normalizeTags(["a".repeat(1_000_000)])).toBeNull();
    expect(normalizeTags(["a".repeat(65)])).toBeNull();
    expect(normalizeTags(["😀".repeat(32)])).toHaveLength(1);
  });
  it("trims U+0085 at the edges but rejects it inside a tag", () => {
    expect(normalizeTags(["\u0085Work\u0085", " \u0085 work \u0085 "])).toEqual(["work"]);
    expect(normalizeTags(["\u0085"])).toBeNull();
    expect(normalizeTags(["\u0085a\u0085b\u0085"])).toBeNull();
  });
  it("trims every whitespace code unit that validation rejects, and nothing else", () => {
    for (let code = 0; code < 0x10000; code++) {
      if (code >= 0xd800 && code <= 0xdfff) continue;
      const ch = String.fromCharCode(code);
      const isSpace = /[\s\u0085]/u.test(ch);
      const padded = `${ch}a${ch}`;
      expect(normalizeTags([padded])).toEqual(isSpace ? ["a"] : [padded.toLowerCase()]);
      expect(normalizeTags([`a${ch}b`]) === null).toBe(isSpace);
    }
  });
  it("trims a heavily padded tag", () => {
    expect(normalizeTags([" \u0085".repeat(500_000) + "a" + "\u0085 ".repeat(500_000)])).toEqual(["a"]);
  });
  it("rejects inner whitespace and empty tags", () => {
    expect(normalizeTags(["a b"])).toBeNull();
    expect(normalizeTags(["a\tb"])).toBeNull();
    expect(normalizeTags(["a\u0085b"])).toBeNull();
    expect(normalizeTags(["  "])).toBeNull();
    expect(normalizeTags([""])).toBeNull();
  });
  it("rejects a non-array value and non-string elements", () => {
    expect(normalizeTags("a")).toBeNull();
    expect(normalizeTags(undefined)).toBeNull();
    expect(normalizeTags([1])).toBeNull();
    expect(normalizeTags(["a", null])).toBeNull();
  });
});
