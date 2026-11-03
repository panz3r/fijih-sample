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

  it("returns normalized tags on create and on list, and [] without tags", async () => {
    const res = await post({ url: "https://example.com/t1", title: "T1", tags: [" Work ", "work", "", "Read"] });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { tags: string[] }).tags).toEqual(["work", "read"]);
    const plain = await post({ url: "https://example.com/t2", title: "T2" });
    expect(((await plain.json()) as { tags: string[] }).tags).toEqual([]);
    const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
    expect(list.find((b) => b.title === "T1")?.tags).toEqual(["work", "read"]);
    expect(list.find((b) => b.title === "T2")?.tags).toEqual([]);
  });

  it("answers 400 invalid tag for bad tags and stores nothing", async () => {
    const before = ((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length;
    for (const tags of [["a b"], ["a".repeat(33)], "work", null, ["a", 1]]) {
      const res = await post({ url: "https://example.com/bad", title: "Bad", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
    }
    const after = ((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length;
    expect(after).toBe(before);
  });
});
