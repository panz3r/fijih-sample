import { randomUUID } from "node:crypto";
import { isValidBookmarkUrl, isValidTag, normalizeTags, normalizeUrl, sortByCreatedDesc, type Bookmark, type NewBookmark } from "@sample/shared";

export class ValidationError extends Error {}

export class BookmarkStore {
  private readonly items = new Map<string, Bookmark>();

  list(): Bookmark[] {
    // Newest insertion first before the stable sort, so bookmarks created in the same millisecond list newest first too.
    return sortByCreatedDesc([...this.items.values()].reverse());
  }

  add(input: NewBookmark, now: () => Date = () => new Date()): Bookmark {
    if (!input.title?.trim()) throw new ValidationError("title is required");
    if (!isValidBookmarkUrl(input.url)) throw new ValidationError("url must be http or https");
    // Validate the normalised tags: lower-casing can lengthen a tag past the limit.
    const tags = normalizeTags(input.tags ?? []);
    if (!tags.every(isValidTag)) throw new ValidationError("invalid tag");
    const url = normalizeUrl(input.url);
    for (const existing of this.items.values()) {
      if (existing.url === url) throw new ValidationError("url already bookmarked");
    }
    const bookmark: Bookmark = {
      id: randomUUID(), url, title: input.title.trim(),
      createdAt: now().toISOString(),
      tags,
    };
    this.items.set(bookmark.id, bookmark);
    return bookmark;
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}
