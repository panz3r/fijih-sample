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

  it("defaults tags to an empty array", () => {
    expect(new BookmarkStore().add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
  });

  it("normalises tags", () => {
    const store = new BookmarkStore();
    const bookmark = store.add({ url: "https://example.com/a", title: "A", tags: [" Work ", "work", "Reading"] });
    expect(bookmark.tags).toEqual(["work", "reading"]);
    expect(store.list()[0].tags).toEqual(["work", "reading"]);
  });

  it.each([
    ["too long", ["x".repeat(33)]],
    ["inner whitespace", ["two words"]],
    ["empty after trimming", ["  "]],
    ["not strings", [1]],
  ])("rejects an invalid tag (%s) and stores nothing", (_name, tags) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: tags as string[] })).toThrow(
      new ValidationError("invalid tag"),
    );
    expect(store.list()).toEqual([]);
  });
});
