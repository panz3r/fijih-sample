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

  it("renders tags after the title and before Remove, joined by a comma and space", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: ["news", "tech"] }], () => {});
    const item = list.querySelector("li");
    expect(item?.querySelector(".tags")?.textContent).toBe("news, tech");
    expect([...(item?.children ?? [])].map((c) => c.tagName)).toEqual(["A", "SPAN", "BUTTON"]);
  });

  it("renders no tags element when a bookmark has no tags", () => {
    const list = document.createElement("ul");
    renderList(list, [{ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags: [] }], () => {});
    expect(list.querySelector(".tags")).toBeNull();
    expect(list.querySelector("li")?.textContent).toBe("ExampleRemove");
  });

  describe("total tags heading", () => {
    const bm = (id: string, tags: string[]) => ({ id, url: `https://example.com/${id}`, title: id, createdAt: "2026-01-01T00:00:00Z", tags });
    const setup = () => {
      document.body.innerHTML = "<h1>Bookmarks</h1>";
      return document.createElement("ul");
    };

    it("shows Bookmarks (0) with no bookmarks and with no tags", () => {
      const list = setup();
      renderList(list, [], () => {});
      expect(document.querySelector("h1")?.textContent).toBe("Bookmarks (0)");
      expect(document.title).toBe("Bookmarks (0)");
      renderList(list, [bm("a", []), bm("b", [])], () => {});
      expect(document.querySelector("h1")?.textContent).toBe("Bookmarks (0)");
      expect(document.title).toBe("Bookmarks (0)");
    });

    it("counts duplicate tags across bookmarks", () => {
      const list = setup();
      renderList(list, [bm("a", ["news"]), bm("b", ["news"])], () => {});
      expect(document.querySelector("h1")?.textContent).toBe("Bookmarks (2)");
      expect(document.title).toBe("Bookmarks (2)");
    });

    it("updates on re-render after an add and a remove", () => {
      const list = setup();
      renderList(list, [bm("a", ["x"])], () => {});
      expect(document.title).toBe("Bookmarks (1)");
      renderList(list, [bm("a", ["x"]), bm("b", ["y", "z"])], () => {});
      expect(document.querySelector("h1")?.textContent).toBe("Bookmarks (3)");
      expect(document.title).toBe("Bookmarks (3)");
      renderList(list, [bm("b", ["y", "z"])], () => {});
      expect(document.querySelector("h1")?.textContent).toBe("Bookmarks (2)");
      expect(document.title).toBe("Bookmarks (2)");
    });
  });
});
