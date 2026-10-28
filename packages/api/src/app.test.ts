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
    const listUrls = async () => ((await (await fetch(`${base}/bookmarks`)).json()) as { url: string }[]).map((b) => b.url);

    it("normalizes tags on create and returns them from GET", async () => {
      const res = await post({ url: "https://tags.example/a", title: "T", tags: [" News ", "news", "Tech"] });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual(["news", "tech"]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
      expect(list.find((b) => b.url === "https://tags.example/a")?.tags).toEqual(["news", "tech"]);
    });

    it("defaults to an empty tags array", async () => {
      const res = await post({ url: "https://tags.example/none", title: "T" });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { tags: string[] }).tags).toEqual([]);
      const list = (await (await fetch(`${base}/bookmarks`)).json()) as { url: string; tags: string[] }[];
      expect(list.find((b) => b.url === "https://tags.example/none")?.tags).toEqual([]);
    });

    it("accepts a 32-character tag", async () => {
      expect((await post({ url: "https://tags.example/32", title: "T", tags: ["a".repeat(32)] })).status).toBe(201);
    });

    it.each([
      ["a 33-character tag", ["a".repeat(33)]],
      ["inner whitespace", ["my tag"]],
      ["a blank tag", ["  "]],
      ["a non-array tags value", "news"],
      ["a non-string element", [1]],
    ])("rejects %s and stores nothing", async (_name, tags) => {
      const url = `https://tags.example/bad-${_name.replace(/\W/g, "")}`;
      const res = await post({ url, title: "T", tags });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid tag" });
      expect(await listUrls()).not.toContain(url);
    });
  });
});
