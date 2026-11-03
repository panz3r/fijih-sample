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

  it("defaults tags to an empty list", () => {
    expect(new BookmarkStore().add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
  });

  it("stores normalized tags", () => {
    const store = new BookmarkStore();
    const added = store.add({ url: "https://example.com/a", title: "A", tags: [" News ", "TECH", "news"] });
    expect(added.tags).toEqual(["news", "tech"]);
    expect(store.list()[0].tags).toEqual(["news", "tech"]);
  });

  it("rejects an invalid tag and stores nothing", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["a b"] })).toThrow("invalid tag");
    expect(store.list()).toEqual([]);
  });
});
