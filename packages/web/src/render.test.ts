import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderList } from "./render.js";

describe("renderList", () => {
  it("shows an empty state", () => {
    const list = document.createElement("ul");
    renderList(list, [], () => {});
    expect(list.textContent).toBe("No bookmarks yet.");
  });

  it("renders one item per bookmark and wires Remove", () => {
    const list = document.createElement("ul");
    const onRemove = vi.fn();
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: [] }], onRemove);
    expect(list.querySelectorAll("li")).toHaveLength(1);
    expect(list.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    list.querySelector("button")?.click();
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("shows tags comma separated right after the title", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: ["a", "b"] }], () => {});
    const tags = list.querySelector(".tags");
    expect(tags?.textContent).toBe("a, b");
    expect(list.querySelector("a")?.nextElementSibling).toBe(tags);
  });

  it("shows no tag element or separator text without tags", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: [] }], () => {});
    expect(list.querySelector(".tags")).toBeNull();
    expect(list.querySelector("li")?.textContent).toBe("ExampleRemove");
  });
});

describe("page styles", () => {
  it("lets a long tag shrink and break so Remove stays in the row", () => {
    const html = readFileSync("index.html", "utf8");
    const rule = /\.tags\s*\{([^}]*)\}/.exec(html)?.[1] ?? "";
    expect(rule).toMatch(/min-width:\s*0/);
    expect(rule).toMatch(/overflow-wrap:\s*anywhere/);
  });
  it("lets the title link shrink and break when tags share its row", () => {
    const html = readFileSync("index.html", "utf8");
    const rule = /li a\s*\{([^}]*)\}/.exec(html)?.[1] ?? "";
    expect(rule).toMatch(/min-width:\s*0/);
    expect(rule).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
