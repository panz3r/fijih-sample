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

  it("shows tags after the title, comma separated", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: ["news", "tech"] }], () => {});
    const item = list.querySelector("li")!;
    expect(list.querySelector(".tags")?.textContent).toBe("news, tech");
    expect(item.children[0].tagName).toBe("A");
    expect(item.children[1]).toBe(list.querySelector(".tags"));
  });

  it("renders no tags element for a bookmark without tags", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: [] }], () => {});
    expect(list.querySelector(".tags")).toBeNull();
    expect(list.querySelector("li")?.textContent).toBe("ExampleRemove");
  });
});
