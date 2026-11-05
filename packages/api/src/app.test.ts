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

    it("defaults to an empty list, normalises, and returns tags on GET", async () => {
      const plain = await post({ url: "https://tags.example.com/plain", title: "Plain" });
      expect(plain.status).toBe(201);
      expect(((await plain.json()) as { tags: string[] }).tags).toEqual([]);
      const tagged = await post({ url: "https://tags.example.com/tagged", title: "Tagged", tags: [" Work ", "work", "Read"] });
      expect(tagged.status).toBe(201);
      expect(((await tagged.json()) as { tags: string[] }).tags).toEqual(["work", "read"]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { title: string; tags: string[] }[];
      expect(list.find((b) => b.title === "Tagged")?.tags).toEqual(["work", "read"]);
      expect(list.find((b) => b.title === "Plain")?.tags).toEqual([]);
    });

    it.each([["33 characters", ["a".repeat(33)]], ["inner whitespace", ["to read"]], ["non-array", "work"], ["null", null], ["empty", [" "]]])(
      "answers 400 for an invalid tag (%s) and stores nothing",
      async (_name, tags) => {
        const before = ((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length;
        const res = await post({ url: "https://tags.example.com/bad", title: "Bad", tags });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "invalid tag" });
        expect(((await (await fetch(`${base}/bookmarks`)).json()) as unknown[]).length).toBe(before);
      },
    );
  });
});
