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

  it("accepts tags, normalizes them, and lists them", async () => {
    const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
    const tagged = await post({ url: "https://example.com/tagged", title: "T", tags: [" News", "tech", "news"] });
    expect(tagged.status).toBe(201);
    expect(((await tagged.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
    const plain = await post({ url: "https://example.com/plain", title: "P" });
    expect(plain.status).toBe(201);
    expect(((await plain.json()) as { tags: string[] }).tags).toEqual([]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
    expect(list.find((b) => b.title === "T")?.tags).toEqual(["news", "tech"]);
    expect(list.find((b) => b.title === "P")?.tags).toEqual([]);
  });

  it("rejects an invalid tag and stores nothing", async () => {
    const before = (await (await fetch(`${base}/bookmarks`)).json()) as unknown[];
    for (const tag of ["a".repeat(33), "two words"]) {
      const res = await fetch(`${base}/bookmarks`, {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/bad", title: "Bad", tags: [tag] }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
    }
    expect(await (await fetch(`${base}/bookmarks`)).json()).toEqual(before);
  });
});
