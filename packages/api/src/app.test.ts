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

  const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });

  it("defaults tags to an empty array", async () => {
    const res = await post({ url: "https://tags.example.com/none", title: "No tags" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
  });

  it("normalizes tags and returns them from GET", async () => {
    const res = await post({ url: "https://tags.example.com/some", title: "Tags", tags: [" News ", "news", "Tech"] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
    expect(list.find((b) => b.url === "https://tags.example.com/some")?.tags).toEqual(["news", "tech"]);
  });

  it("rejects invalid tags with 400 and stores nothing", async () => {
    const bad: unknown[] = [["a".repeat(33)], ["breaking news"], [""], "news", null, [1]];
    for (const [i, tags] of bad.entries()) {
      const res = await post({ url: `https://tags.example.com/bad${i}`, title: "Bad", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
    }
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string }[];
    expect(list.some((b) => b.url.includes("/bad"))).toBe(false);
  });

  it("accepts a 32-character tag", async () => {
    const res = await post({ url: "https://tags.example.com/edge", title: "Edge", tags: ["a".repeat(32)] });
    expect(res.status).toBe(201);
  });
});
