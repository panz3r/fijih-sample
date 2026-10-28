import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";

const server = createApp();
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("bookmarks api", () => {
  it("starts empty", async () => {
    const res = await fetch(`${base}/bookmarks`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("creates, lists newest first, and deletes", async () => {
    const first = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/a", title: "A" }),
    });
    expect(first.status).toBe(201);
    const second = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/b", title: "B" }),
    });
    const created = (await second.json()) as { id: string };
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string }[];
    expect(list.map((b) => b.title)).toEqual(["B", "A"]);
    expect((await fetch(`${base}/bookmarks/${created.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${base}/bookmarks/${created.id}`, { method: "DELETE" })).status).toBe(404);
  });

  it("rejects invalid input", async () => {
    const res = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "ftp://example.com", title: "x" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url must be http or https" });
  });

  describe("tags", () => {
    const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
    const count = async () => ((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length;
    let n = 0;
    const fresh = () => `https://tags.example.com/${n++}`;

    it("normalises tags and returns them from POST and GET", async () => {
      const res = await post({ url: fresh(), title: "T", tags: [" Work ", "work", "READ"] });
      expect(res.status).toBe(201);
      const created = (await res.json()) as { id: string; tags: string[] };
      expect(created.tags).toEqual(["work", "read"]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { id: string; tags: string[] }[];
      expect(list.find((b) => b.id === created.id)?.tags).toEqual(["work", "read"]);
    });

    it("defaults tags to an empty array", async () => {
      const missing = await post({ url: fresh(), title: "T" });
      expect(missing.status).toBe(201);
      expect(((await missing.json()) as { tags: string[] }).tags).toEqual([]);
      const empty = await post({ url: fresh(), title: "T", tags: [] });
      expect(empty.status).toBe(201);
      expect(((await empty.json()) as { tags: string[] }).tags).toEqual([]);
    });

    it("accepts a 32-character tag, also after trimming and lower-casing", async () => {
      const res = await post({ url: fresh(), title: "T", tags: [`  ${"A".repeat(32)}  `] });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual(["a".repeat(32)]);
    });

    it.each([
      ["33 characters", ["a".repeat(33)]],
      ["internal space", ["two words"]],
      ["internal tab", ["a\tb"]],
      ["empty", [""]],
      ["whitespace only", ["   "]],
      ["not an array (string)", "work"],
      ["not an array (null)", null],
      ["not an array (object)", {}],
      ["non-string entry", [1]],
      ["null entry", ["a", null]],
    ])("rejects %s with 400 invalid tag and stores nothing", async (_name, tags) => {
      const before = await count();
      const res = await post({ url: fresh(), title: "T", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await count()).toBe(before);
    });
  });
});
