import { describe, expect, it } from "vitest";
import { BookmarkStore, ValidationError } from "./store.ts";

describe("BookmarkStore", () => {
  it("lists bookmarks created in the same millisecond newest first", () => {
    const store = new BookmarkStore();
    const now = () => new Date("2026-01-01T00:00:00.000Z");
    store.add({ url: "https://example.com/a", title: "A" }, now);
    store.add({ url: "https://example.com/b", title: "B" }, now);
    expect(store.list().map((b) => b.title)).toEqual(["B", "A"]);
  });

  it("defaults tags to [] and lists normalized tags", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
    store.add({ url: "https://example.com/b", title: "B", tags: [" News ", "news", "Tech"] });
    expect(store.list()[0].tags).toEqual(["news", "tech"]);
  });

  it("throws invalid tag and stores nothing for a bad tag", () => {
    const store = new BookmarkStore();
    for (const tags of [["a b"], ["a".repeat(33)], [""], "news", null, [1]]) {
      expect(() => store.add({ url: "https://example.com/c", title: "C", tags })).toThrow(new ValidationError("invalid tag"));
    }
    expect(store.list()).toEqual([]);
  });
});
