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

  it("stores normalized tags and drops empty-after-trim tags without error", () => {
    const store = new BookmarkStore();
    const added = store.add({ url: "https://example.com/a", title: "A", tags: [" News ", "", "   ", "NEWS", "tech"] });
    expect(added.tags).toEqual(["news", "tech"]);
    expect(store.list()[0].tags).toEqual(["news", "tech"]);
  });

  it("accepts a 32-character tag", () => {
    expect(new BookmarkStore().add({ url: "https://example.com/a", title: "A", tags: ["a".repeat(32)] }).tags).toHaveLength(1);
  });

  it.each([
    ["too long", ["a".repeat(33)]],
    ["whitespace", ["two words"]],
    ["non-string element", [1]],
    ["non-array tags", "news"],
  ])("rejects an invalid tag (%s) and stores nothing", (_name, tags) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: tags as unknown as string[] })).toThrow(
      new ValidationError("invalid tag"),
    );
    expect(store.list()).toEqual([]);
  });
});
