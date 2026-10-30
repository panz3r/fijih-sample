import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.ts";

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
    const list = async () => (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];

    it("returns normalized tags on create and list, and [] when omitted", async () => {
      const withTags = await post({ url: "https://example.com/t1", title: "T1", tags: [" TECH ", "News", "news"] });
      expect(withTags.status).toBe(201);
      expect(((await withTags.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
      const without = await post({ url: "https://example.com/t2", title: "T2" });
      expect(((await without.json()) as { tags: string[] }).tags).toEqual([]);
      const all = await list();
      expect(all.find((b) => b.url === "https://example.com/t1")?.tags).toEqual(["news", "tech"]);
      expect(all.find((b) => b.url === "https://example.com/t2")?.tags).toEqual([]);
    });

    it("returns tags sorted alphabetically", async () => {
      const res = await post({ url: "https://example.com/t3", title: "T3", tags: ["b", "A", "c"] });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual(["a", "b", "c"]);
    });

    it.each([
      ["too long", { tags: ["a".repeat(33)] }],
      ["whitespace", { tags: ["two words"] }],
      ["empty string", { tags: [""] }],
      ["empty after trim", { tags: ["   "] }],
      ["not an array", { tags: "news" }],
      ["non-string element", { tags: [1] }],
    ])("answers 400 invalid tag for %s and creates nothing", async (_name, extra) => {
      const before = (await list()).length;
      const res = await post({ url: "https://example.com/bad", title: "Bad", ...extra });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await list()).toHaveLength(before);
    });
  });
});
