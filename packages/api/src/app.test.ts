import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.ts";
import { BookmarkStore } from "./store.ts";

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

describe("bookmarks csv export", () => {
  const csvStore = new BookmarkStore();
  const csvServer = createApp(csvStore);
  let csvBase = "";

  beforeAll(async () => {
    await new Promise<void>((resolve) => csvServer.listen(0, resolve));
    csvBase = `http://localhost:${(csvServer.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => csvServer.close(() => resolve())));

  it("answers header only with csv headers when empty", async () => {
    const res = await fetch(`${csvBase}/bookmarks.csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="bookmarks.csv"');
    expect(await res.text()).toBe("title,url,createdAt\r\n");
  });

  it("lists bookmarks newest first", async () => {
    csvStore.add({ url: "https://example.com/a", title: "A" }, () => new Date("2026-01-01T00:00:00.000Z"));
    csvStore.add({ url: "https://example.com/b", title: "B, two" }, () => new Date("2026-01-02T00:00:00.000Z"));
    const res = await fetch(`${csvBase}/bookmarks.csv`);
    expect(await res.text()).toBe(
      'title,url,createdAt\r\n"B, two",https://example.com/b,2026-01-02T00:00:00.000Z\r\nA,https://example.com/a,2026-01-01T00:00:00.000Z\r\n',
    );
  });
});
