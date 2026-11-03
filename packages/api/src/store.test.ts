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

  it("stores normalized tags, defaulting to an empty list", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A" }).tags).toEqual([]);
    const tagged = store.add({ url: "https://example.com/b", title: "B", tags: [" Work ", "work", "", "Read"] });
    expect(tagged.tags).toEqual(["work", "read"]);
    expect(store.list()[0].tags).toEqual(["work", "read"]);
  });

  it("rejects an invalid tag and stores nothing", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["a b"] })).toThrow("invalid tag");
    expect(store.list()).toEqual([]);
  });

  it("validates tags before the duplicate-url check", () => {
    const store = new BookmarkStore();
    store.add({ url: "https://example.com/a", title: "A" });
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["a b"] })).toThrow("invalid tag");
  });
});
