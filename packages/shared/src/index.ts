export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] };

export const MAX_TAG_LENGTH = 32;

/** Returns true when the trimmed tag is non-empty, at most 32 characters, and has no whitespace. */
export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TAG_LENGTH && !/\s/.test(trimmed);
}

/** Trims and lower-cases each tag and removes duplicates, keeping the first occurrence's position. */
export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Returns true when the URL parses and uses http or https. */
export function isValidBookmarkUrl(value: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Lower-cases the host, drops a default port, a trailing slash, and the fragment. */
export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  let out = url.toString();
  if (url.pathname === "/" && !url.search) out = out.replace(/\/$/, "");
  return out;
}

/** Sorts newest first; ties keep their input order. */
export function sortByCreatedDesc<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Total number of tags across bookmarks; duplicates across bookmarks are counted. */
export function countTags(bookmarks: readonly { tags: readonly string[] }[]): number {
  return bookmarks.reduce((total, bookmark) => total + bookmark.tags.length, 0);
}
