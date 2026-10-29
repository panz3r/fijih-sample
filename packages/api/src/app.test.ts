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
});

describe("bookmark tags", () => {
  const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
  const listed = async (url: string) =>
    ((await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[]).find((b) => b.url === url);

  it("stores normalised tags and lists them", async () => {
    const res = await post({ url: "https://tags.example/a", title: "T", tags: ["  Work", "work", "News"] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["work", "news"]);
    expect((await listed("https://tags.example/a"))?.tags).toEqual(["work", "news"]);
  });

  it("defaults to an empty tag list", async () => {
    const res = await post({ url: "https://tags.example/b", title: "T" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
    expect((await listed("https://tags.example/b"))?.tags).toEqual([]);
  });

  it.each([
    ["a 33-character tag", ["a".repeat(33)]],
    ["a tag with whitespace", ["a b"]],
    ["an empty tag", ["  "]],
    ["a non-string tag", [1]],
    ["a non-array tags value", "work"],
    ["a null tags value", null],
  ])("rejects %s with 400 and stores nothing", async (_name, tags) => {
    const url = `https://tags.example/bad-${_name.replaceAll(" ", "-")}`;
    const res = await post({ url, title: "T", tags });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid tag" });
    expect(await listed(url)).toBeUndefined();
  });
});

