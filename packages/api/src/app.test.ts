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
  const listAll = async () => (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];

  it("accepts tags, normalises them, and lists them", async () => {
    const res = await post({ url: "https://example.com/tags", title: "T", tags: [" Work", "work ", "Reading"] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["work", "reading"]);
    expect((await listAll()).find((b) => b.url === "https://example.com/tags")?.tags).toEqual(["work", "reading"]);
  });

  it("gives an empty tags list without tags", async () => {
    const res = await post({ url: "https://example.com/notags", title: "N" });
    expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
    expect((await listAll()).find((b) => b.url === "https://example.com/notags")?.tags).toEqual([]);
  });

  it("accepts a 32-character tag", async () => {
    expect((await post({ url: "https://example.com/t32", title: "T", tags: ["a".repeat(32)] })).status).toBe(201);
  });

  it.each([
    ["too long", ["a".repeat(33)]],
    ["inner whitespace", ["to read"]],
    ["empty", ["  "]],
    ["not an array", "work"],
    ["null", null],
    ["not a string", ["ok", 1]],
  ])("rejects an invalid tag (%s) and stores nothing", async (_name, tags) => {
    const before = await listAll();
    const res = await post({ url: "https://example.com/bad", title: "Bad", tags });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid tag" });
    expect(await listAll()).toEqual(before);
  });
});
