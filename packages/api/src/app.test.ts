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

  it("accepts, normalizes, and lists tags", async () => {
    const res = await fetch(`${base}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/tagged", title: "T", tags: [" News ", "TECH", "news"] }),
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
    expect(list.find((b) => b.title === "T")?.tags).toEqual(["news", "tech"]);
    expect(list.every((b) => Array.isArray(b.tags))).toBe(true);
  });

  it("rejects an invalid tag with 400 and stores nothing", async () => {
    for (const tags of [["a b"], ["a".repeat(33)], "news", [1], [" "]]) {
      const res = await fetch(`${base}/bookmarks`, {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/bad-tag", title: "Bad", tags }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
    }
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string }[];
    expect(list.some((b) => b.title === "Bad")).toBe(false);
  });
});
