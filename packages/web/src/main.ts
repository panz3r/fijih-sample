import type { Bookmark } from "@sample/shared";
import { renderList } from "./render.js";

const list = document.querySelector<HTMLUListElement>("#list")!;
const form = document.querySelector<HTMLFormElement>("#add")!;
const error = document.querySelector<HTMLElement>("#error")!;

async function refresh(): Promise<void> {
  const bookmarks = (await (await fetch("/bookmarks")).json()) as Bookmark[];
  renderList(list, bookmarks, async (id) => {
    await fetch(`/bookmarks/${id}`, { method: "DELETE" });
    await refresh();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const res = await fetch("/bookmarks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: data.get("title"), url: data.get("url") }),
  });
  if (res.ok) {
    form.reset();
    error.textContent = "";
    await refresh();
  } else {
    error.textContent = ((await res.json()) as { error: string }).error;
  }
});

void refresh();
