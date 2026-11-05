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

  it("stores normalized tags and defaults to []", () => {
    const store = new BookmarkStore();
    const tagged = store.add({ url: "https://example.com/a", title: "A", tags: [" Work ", "home", "WORK"] });
    expect(tagged.tags).toEqual(["work", "home"]);
    expect(store.add({ url: "https://example.com/b", title: "B" }).tags).toEqual([]);
    expect(store.list().map((b) => b.tags)).toEqual([[], ["work", "home"]]);
  });

  it("accepts a 32-character tag", () => {
    const store = new BookmarkStore();
    expect(store.add({ url: "https://example.com/a", title: "A", tags: ["a".repeat(32)] }).tags).toEqual(["a".repeat(32)]);
  });

  it.each([
    ["too long", ["a".repeat(33)]],
    ["internal whitespace", ["two words"]],
    ["empty", [""]],
    ["blank", ["   "]],
    ["not an array", "work"],
    ["non-string entry", ["ok", 1]],
  ])("rejects an invalid tag (%s) and leaves the list unchanged", (_name, tags) => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "https://example.com/a", title: "A", tags: tags as string[] })).toThrow(
      new ValidationError("invalid tag"),
    );
    expect(store.list()).toEqual([]);
  });

  it("checks title and url before tags", () => {
    const store = new BookmarkStore();
    expect(() => store.add({ url: "ftp://x", title: "A", tags: ["two words"] })).toThrow("url must be http or https");
  });
});
