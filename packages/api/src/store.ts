import { randomUUID } from "node:crypto";
import { isValidBookmarkUrl, isValidTag, normalizeTags, normalizeUrl, sortByCreatedDesc, type Bookmark, type NewBookmark } from "@sample/shared";

export class ValidationError extends Error {}

/** Defaults a missing value to [] and throws ValidationError for a malformed or invalid tag list. */
function parseTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) throw new ValidationError("invalid tag");
  const tags = normalizeTags(value as string[]);
  if (!tags.every(isValidTag)) throw new ValidationError("invalid tag");
  return tags;
}

export class BookmarkStore {
  private readonly items = new Map<string, Bookmark>();

  list(): Bookmark[] {
    return sortByCreatedDesc([...this.items.values()]);
  }

  add(input: Omit<NewBookmark, "tags"> & { tags?: unknown }, now: () => Date = () => new Date()): Bookmark {
    if (!input.title?.trim()) throw new ValidationError("title is required");
    if (!isValidBookmarkUrl(input.url)) throw new ValidationError("url must be http or https");
    const tags = parseTags(input.tags);
    const url = normalizeUrl(input.url);
    for (const existing of this.items.values()) {
      if (existing.url === url) throw new ValidationError("url already bookmarked");
    }
    const bookmark: Bookmark = { id: randomUUID(), url, title: input.title.trim(), createdAt: now().toISOString(), tags };
    this.items.set(bookmark.id, bookmark);
    return bookmark;
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}
