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

  it("defaults tags to an empty list", () => {
    expect(new BookmarkStore().add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
  });

  it("normalises tags", () => {
    const store = new BookmarkStore();
    const bookmark = store.add({ url: "https://example.com/a", title: "A", tags: [" Work ", "work", "Read"] });
    expect(bookmark.tags).toEqual(["work", "read"]);
    expect(store.list()[0].tags).toEqual(["work", "read"]);
  });

  it("accepts a 32-character tag", () => {
    const tag = "a".repeat(32);
    expect(new BookmarkStore().add({ url: "https://example.com/a", title: "A", tags: [tag] }).tags).toEqual([tag]);
  });

  it.each([["too long", ["a".repeat(33)]], ["whitespace", ["to read"]], ["empty", ["  "]], ["string", "work"], ["null", null], ["number entry", ["a", 1]]])(
    "rejects an invalid tag (%s) and stores nothing",
    (_name, tags) => {
      const store = new BookmarkStore();
      expect(() => store.add({ url: "https://example.com/a", title: "A", tags })).toThrow(ValidationError);
      expect(() => store.add({ url: "https://example.com/a", title: "A", tags })).toThrow("invalid tag");
      expect(store.list()).toEqual([]);
    },
  );
});
