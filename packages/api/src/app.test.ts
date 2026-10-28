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

    it("trims, lower-cases, and deduplicates tags on create and returns them on list", async () => {
      const res = await post({ url: "https://tags.example/one", title: "T", tags: [" News ", "news", "Tech"] });
      expect(res.status).toBe(201);
      const created = (await res.json()) as { tags: string[] };
      expect(created.tags).toEqual(["news", "tech"]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
      expect(list.find((b) => b.url === "https://tags.example/one")?.tags).toEqual(["news", "tech"]);
    });

    it("defaults tags to []", async () => {
      const missing = (await (await post({ url: "https://tags.example/two", title: "T" })).json()) as { tags: string[] };
      expect(missing.tags).toEqual([]);
      const empty = (await (await post({ url: "https://tags.example/three", title: "T", tags: [] })).json()) as {
        tags: string[];
      };
      expect(empty.tags).toEqual([]);
    });

    it("answers 400 invalid tag and stores nothing", async () => {
      const bad: unknown[] = ["a".repeat(33), "two words", 5, " "];
      for (const [i, tag] of bad.entries()) {
        const res = await post({ url: `https://tags.example/bad${i}`, title: "T", tags: [tag] });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "invalid tag" });
      }
      expect((await post({ url: "https://tags.example/notarray", title: "T", tags: "news" })).status).toBe(400);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string }[];
      expect(list.some((b) => b.url.includes("tags.example/bad") || b.url.includes("notarray"))).toBe(false);
    });

    it("accepts a 32-character tag", async () => {
      const res = await post({ url: "https://tags.example/edge", title: "T", tags: ["a".repeat(32)] });
      expect(res.status).toBe(201);
    });
  });
});
