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
    const list = async () => (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];

    it("normalises tags and returns them on create and list", async () => {
      const res = await post({ url: "https://tags.example.com/1", title: "T", tags: ["  News ", "tech", "NEWS"] });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
      expect((await list()).find((b) => b.url === "https://tags.example.com/1")?.tags).toEqual(["news", "tech"]);
    });

    it("defaults to an empty list without tags or with []", async () => {
      const a = await post({ url: "https://tags.example.com/2", title: "T" });
      expect(a.status).toBe(201);
      expect(((await a.json()) as { tags: string[] }).tags).toEqual([]);
      const b = await post({ url: "https://tags.example.com/3", title: "T", tags: [] });
      expect(b.status).toBe(201);
      expect(((await b.json()) as { tags: string[] }).tags).toEqual([]);
    });

    it("accepts a 32 code point tag", async () => {
      expect((await post({ url: "https://tags.example.com/4", title: "T", tags: ["a".repeat(32)] })).status).toBe(201);
    });

    it.each([
      ["too long", ["a".repeat(33)]],
      ["inner whitespace", ["two words"]],
      ["empty after trim", ["   "]],
      ["not an array", "news"],
      ["non-string element", ["ok", 1]],
    ])("rejects %s with 400 and stores nothing", async (_name, tags) => {
      const before = await list();
      const res = await post({ url: "https://tags.example.com/bad", title: "T", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await list()).toEqual(before);
    });
  });
});
