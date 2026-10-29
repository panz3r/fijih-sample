import { randomUUID } from "node:crypto";
import { isValidBookmarkUrl, isValidTag, normalizeTags, normalizeUrl, sortByCreatedDesc, type Bookmark, type NewBookmark } from "@sample/shared";

export class ValidationError extends Error {}

export class BookmarkStore {
  private readonly items = new Map<string, Bookmark>();

  list(): Bookmark[] {
    return sortByCreatedDesc([...this.items.values()]);
  }

  add(input: NewBookmark, now: () => Date = () => new Date(), options: { allowDuplicateUrl?: boolean } = {}): Bookmark {
    if (!input.title?.trim()) throw new ValidationError("title is required");
    if (!isValidBookmarkUrl(input.url)) throw new ValidationError("url must be http or https");
    const url = normalizeUrl(input.url);
    // Admins may bookmark a URL twice, for example to keep two titles for it.
    if (!options.allowDuplicateUrl) {
      for (const existing of this.items.values()) {
        if (existing.url === url) throw new ValidationError("url already bookmarked");
      }
    }
    const rawTags: unknown = input.tags ?? [];
    if (!Array.isArray(rawTags) || !rawTags.every((tag) => typeof tag === "string" && isValidTag(tag))) {
      throw new ValidationError("invalid tag");
    }
    const title = input.title.trim();
    const bookmark: Bookmark = {
      id: randomUUID(),
      url,
      title,
      createdAt: now().toISOString(),
      tags: normalizeTags(rawTags as string[]),
    };
    this.items.set(bookmark.id, bookmark);
    return bookmark;
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}
