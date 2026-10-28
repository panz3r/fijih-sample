import { countTags, type Bookmark } from "@sample/shared";

/** Renders the bookmark list into `list`; `onRemove` is called with the id of a clicked Remove button. */
export function renderList(list: HTMLElement, bookmarks: readonly Bookmark[], onRemove: (id: string) => void): void {
  const heading = `Bookmarks (${countTags(bookmarks)})`;
  document.title = heading;
  const h1 = document.querySelector("h1");
  if (h1) h1.textContent = heading;
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
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", () => onRemove(bookmark.id));
    item.append(link);
    if (bookmark.tags.length > 0) {
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = bookmark.tags.join(", ");
      item.append(tags);
    }
    item.append(remove);
    list.append(item);
  }
}
