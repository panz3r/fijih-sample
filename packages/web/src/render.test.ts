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

  const bookmark = (tags: string[]) => ({ id: "1", url: "https://example.com", title: "Example", createdAt: "2026-01-01T00:00:00Z", tags });

  it("shows tags after the title, comma separated, then the count", () => {
    const list = document.createElement("ul");
    renderList(list, [bookmark(["work", "read"])], () => {});
    const children = [...list.querySelector("li")!.children];
    expect(children.map((c) => c.tagName)).toEqual(["A", "SPAN", "SPAN", "BUTTON"]);
    expect(list.querySelector(".tags")?.textContent).toBe("work, read");
    expect(list.querySelector(".tag-count")?.textContent).toBe("(2 tags)");
  });

  it("uses the singular for one tag", () => {
    const list = document.createElement("ul");
    renderList(list, [bookmark(["work"])], () => {});
    expect(list.querySelector(".tags")?.textContent).toBe("work");
    expect(list.querySelector(".tag-count")?.textContent).toBe("(1 tag)");
  });

  it("renders no tags element and no count without tags", () => {
    const list = document.createElement("ul");
    renderList(list, [bookmark([])], () => {});
    expect(list.querySelector(".tags")).toBeNull();
    expect(list.querySelector(".tag-count")).toBeNull();
    expect(list.querySelector("li")?.textContent).toBe("ExampleRemove");
  });
});
