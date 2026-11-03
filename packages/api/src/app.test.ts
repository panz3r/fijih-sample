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

  describe("tags", () => {
    const post = (body: unknown) => fetch(`${base}/bookmarks`, { method: "POST", body: JSON.stringify(body) });
    const listTitles = async () => ((await (await fetch(`${base}/bookmarks`)).json()) as { title: string }[]).map((b) => b.title);

    it("returns normalised tags on POST and GET, and [] by default", async () => {
      const withTags = await post({ url: "https://tags.example/a", title: "TA", tags: ["  Work ", "work", "READ"] });
      expect(withTags.status).toBe(201);
      expect(((await withTags.json()) as { tags: string[] }).tags).toEqual(["work", "read"]);
      const without = await post({ url: "https://tags.example/b", title: "TB" });
      expect(((await without.json()) as { tags: string[] }).tags).toEqual([]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
      expect(list.find((b) => b.title === "TA")?.tags).toEqual(["work", "read"]);
      expect(list.find((b) => b.title === "TB")?.tags).toEqual([]);
    });

    it("accepts a 32-character tag", async () => {
      const res = await post({ url: "https://tags.example/c", title: "TC", tags: ["a".repeat(32)] });
      expect(res.status).toBe(201);
    });

    it.each([
      ["longer than 32 characters", ["a".repeat(33)]],
      ["containing whitespace", ["two words"]],
    ])("answers 400 invalid tag for a tag %s and stores nothing", async (_label, tags) => {
      const before = await listTitles();
      const res = await post({ url: "https://tags.example/bad", title: "TBAD", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await listTitles()).toEqual(before);
    });
  });
});
