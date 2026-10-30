import { describe, expect, it } from "vitest";
import { BookmarkStore } from "./store.ts";

describe("BookmarkStore", () => {
  it("lists bookmarks created in the same millisecond newest first", () => {
    const store = new BookmarkStore();
    const now = () => new Date("2026-01-01T00:00:00.000Z");
    store.add({ url: "https://example.com/a", title: "A" }, now);
    store.add({ url: "https://example.com/b", title: "B" }, now);
    expect(store.list().map((b) => b.title)).toEqual(["B", "A"]);
  });

  it("stores normalised tags in first-occurrence order and defaults to []", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
    const tagged = store.add({ url: "https://example.com/b", title: "B", tags: [" News", "tech", "NEWS "] });
    expect(tagged.tags).toEqual(["news", "tech"]);
    expect(store.add({ url: "https://example.com/c", title: "C", tags: [] }).tags).toEqual([]);
  });

  it("accepts a 32-character tag", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A", tags: ["a".repeat(32)] }).tags).toHaveLength(1);
  });

  it.each([
    ["too long", ["a".repeat(33)]],
    ["internal whitespace", ["breaking news"]],
    ["non-array", "news"],
    ["null", null],
    ["non-string element", ["ok", 5]],
    ["empty after trim", ["ok", "  "]],
    ["invalid duplicate", ["ok", "ok", ""]],
    ["NEXT LINE inside", ["news\u0085tech"]],
    ["NEXT LINE only", ["\u0085"]],
  ])("rejects invalid tags (%s) and stores nothing", (_name, tags) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags })).toThrow("invalid tag");
    expect(store.list()).toEqual([]);
  });
});
