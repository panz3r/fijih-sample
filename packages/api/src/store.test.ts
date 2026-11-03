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

  it("defaults tags to an empty array and normalises given tags", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
    expect(store.add({ url: "https://example.com/b", title: "B", tags: ["  Work ", "work", "Read"] }).tags).toEqual(["work", "read"]);
  });

  it("rejects invalid tags and stores nothing", () => {
    const store = new BookmarkStore();
    const bad: unknown[] = [["a".repeat(33)], ["a b"], [""], ["   "], [1], "a", null];
    for (const tags of bad) {
      expect(() => store.add({ url: "https://example.com/a", title: "A", tags: tags as string[] })).toThrow("invalid tag");
    }
    expect(store.list()).toEqual([]);
  });
});
