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

  it("defaults tags to an empty array and stores normalised tags", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
    store.add({ url: "https://example.com/b", title: "B", tags: [" Work ", "work", "Read"] });
    expect(store.list().map((b) => b.tags)).toEqual([["work", "read"], []]);
  });

  it("rejects an invalid tag without storing the bookmark", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["a b"] })).toThrow("invalid tag");
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["x".repeat(33)] })).toThrow(ValidationError);
    expect(store.list()).toEqual([]);
  });
});
