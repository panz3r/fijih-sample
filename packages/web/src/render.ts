import type { Bookmark } from "@sample/shared";

/** Renders the bookmark list into `list`; `onRemove` is called with the id of a clicked Remove button. */
export function renderList(list: HTMLElement, bookmarks: readonly Bookmark[], onRemove: (id: string) => void): void {
  list.replaceChildren();
  if (bookmarks.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No bookmarks yet.";
    list.append(empty);
    return;
  }
  for (const bookmark of bookmarks) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.textContent = bookmark.title;
    link.rel = "noopener";
    const title = document.createElement("span");
    title.append(link);
    if (bookmark.tags.length > 0) {
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = bookmark.tags.join(", ");
      title.append(tags);
    }
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", () => onRemove(bookmark.id));
    item.append(title, remove);
    list.append(item);
  }
}
