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
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", tags: [], createdAt: "2026-01-01T00:00:00Z" }], onRemove);
    expect(list.querySelectorAll("li")).toHaveLength(1);
    expect(list.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    list.querySelector("button")?.click();
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("shows tags comma separated after the title, before Remove", () => {
    const list = document.createElement("ul");
    renderList(
      list,
      [{ id: "1", url: "https://example.com", title: "Example", tags: ["work", "home"], createdAt: "2026-01-01T00:00:00Z" }],
      () => {},
    );
    const tags = list.querySelector(".tags");
    expect(tags?.textContent).toBe("work, home");
    expect(list.querySelector("a")?.nextElementSibling).toBe(tags);
    expect(tags?.nextElementSibling?.tagName).toBe("BUTTON");
  });

  it("shows no tags text or element when a bookmark has none", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", tags: [], createdAt: "2026-01-01T00:00:00Z" }], () => {});
    expect(list.querySelector(".tags")).toBeNull();
    expect(list.querySelector("li")?.textContent).toBe("ExampleRemove");
  });
});
