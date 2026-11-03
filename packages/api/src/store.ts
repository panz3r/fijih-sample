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
    const tags = this.checkTags(input.tags);
    const url = normalizeUrl(input.url);
    for (const existing of this.items.values()) {
      if (existing.url === url) throw new ValidationError("url already bookmarked");
    }
    const bookmark: Bookmark = { id: randomUUID(), url, title: input.title.trim(), createdAt: now().toISOString(), tags };
    this.items.set(bookmark.id, bookmark);
    return bookmark;
  }

  /** Returns the normalised tags; `undefined` means none. Anything else that is not an array of valid tags is rejected. */
  private checkTags(tags: unknown): string[] {
    if (tags === undefined) return [];
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string" && isValidTag(tag))) {
      throw new ValidationError("invalid tag");
    }
    return normalizeTags(tags);
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}
