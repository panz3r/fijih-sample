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

  it("stores normalized tags and defaults to an empty list", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A", tags: [" News", "news", "Tech"] }).tags).toEqual(["news", "tech"]);
    expect(store.add({ url: "https://example.com/b", title: "B" }).tags).toEqual([]);
  });

  it("rejects an invalid tag and stores nothing", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["a".repeat(33)] })).toThrow(new ValidationError("invalid tag"));
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: ["two words"] })).toThrow(ValidationError);
    expect(store.list()).toEqual([]);
  });
});
