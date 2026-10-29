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

  const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
  const listAll = async () => (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];

  it("stores normalized tags and returns them on create and list", async () => {
    const res = await post({ url: "https://example.com/tags-1", title: "T", tags: ["  Work ", "work", "READ"] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["work", "read"]);
    const found = (await listAll()).find((b) => b.url === "https://example.com/tags-1");
    expect(found?.tags).toEqual(["work", "read"]);
  });

  it("defaults tags to an empty array", async () => {
    const res = await post({ url: "https://example.com/tags-2", title: "T" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
    const found = (await listAll()).find((b) => b.url === "https://example.com/tags-2");
    expect(found?.tags).toEqual([]);
  });

  it("accepts a 32-character tag and a padded tag", async () => {
    const res = await post({ url: "https://example.com/tags-3", title: "T", tags: ["a".repeat(32), " ab "] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["a".repeat(32), "ab"]);
  });

  it.each([
    ["a 33-character tag", ["a".repeat(33)]],
    ["interior whitespace", ["a b"]],
    ["an empty tag", [""]],
    ["a whitespace-only tag", ["   "]],
    ["a non-array value", "work"],
    ["a non-string item", [1]],
  ])("rejects %s with 400 invalid tag and stores nothing", async (_name, tags) => {
    const url = `https://example.com/bad-${encodeURIComponent(_name)}`;
    const res = await post({ url, title: "T", tags });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid tag" });
    expect((await listAll()).some((b) => b.url === url)).toBe(false);
  });
});
