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

  it("stores normalised tags and defaults to none", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A", tags: ["  Work ", "work", "READ"] }).tags).toEqual(["work", "read"]);
    expect(store.add({ url: "https://example.com/b", title: "B" }).tags).toEqual([]);
  });

  it("rejects an invalid tag and stores nothing", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["ok", "two words"] })).toThrow("invalid tag");
    expect(store.list()).toEqual([]);
  });
});
