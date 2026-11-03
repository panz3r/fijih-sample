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

  it("normalises tags on create and returns them on list", async () => {
    const res = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/tagged", title: "T", tags: [" News ", "NEWS", "tech"] }),
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
    expect(list.find((b) => b.url === "https://example.com/tagged")?.tags).toEqual(["news", "tech"]);
  });

  it("defaults tags to [] when omitted", async () => {
    const res = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/untagged", title: "U" }),
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
    expect(list.find((b) => b.url === "https://example.com/untagged")?.tags).toEqual([]);
  });

  it.each([["a".repeat(33)], ["a b"], [""], ["   "], ["a\tb"], ["news"], [null], [["ok", 1]]].map((v, i) => [i, v[0]] as const))(
    "rejects invalid tags (case %i) with 400 and stores nothing",
    async (i, tags) => {
      const target = `https://example.com/invalid-${i}`;
      const body = { url: target, title: "X", tags: typeof tags === "string" && i < 5 ? [tags] : tags };
      const res = await fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string }[];
      expect(list.some((b) => b.url === target)).toBe(false);
    },
  );
});
