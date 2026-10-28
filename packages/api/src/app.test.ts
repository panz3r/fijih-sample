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
    const count = async () => ((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length;

    it("normalises tags, defaults to [], and returns them from GET", async () => {
      const res = await post({ url: "https://tags.example.com/a", title: "T", tags: [" Work ", "home", "WORK"] });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual(["work", "home"]);
      const plain = await post({ url: "https://tags.example.com/b", title: "P" });
      expect(((await plain.json()) as { tags: string[] }).tags).toEqual([]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
      expect(list.find((b) => b.title === "T")?.tags).toEqual(["work", "home"]);
      expect(list.find((b) => b.title === "P")?.tags).toEqual([]);
    });

    it.each([
      ["too long", ["a".repeat(33)]],
      ["inner whitespace", ["a b"]],
      ["empty after trim", ["  "]],
      ["non-string entry", [1]],
      ["non-array", "work"],
    ])("rejects %s with 400 and stores nothing", async (_name, tags) => {
      const before = await count();
      const res = await post({ url: "https://tags.example.com/bad", title: "Bad", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await count()).toBe(before);
    });
  });
});
