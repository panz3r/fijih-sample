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

  it("stores normalised tags and defaults to []", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A", tags: [" News ", "NEWS", "Tech"] }).tags).toEqual(["news", "tech"]);
    expect(store.add({ url: "https://example.com/b", title: "B" }).tags).toEqual([]);
  });

  it.each([["a".repeat(33)], ["a b"], [""], ["   "]])("rejects invalid tag %j and stores nothing", (tag) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: [tag] })).toThrow(new ValidationError("invalid tag"));
    expect(store.list()).toEqual([]);
  });

  it.each([["news"], [null], [["a", 1]]])("rejects wrong-shaped tags %j and stores nothing", (tags) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags })).toThrow(new ValidationError("invalid tag"));
    expect(store.list()).toEqual([]);
  });
});
