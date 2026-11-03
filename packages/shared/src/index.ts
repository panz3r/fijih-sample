export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] };

export const MAX_TAG_LENGTH = 32;

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

/**
 * Trims, lower-cases, and deduplicates tags (first occurrence keeps its position); tags empty after trimming are dropped.
 * Returns null when `value` is not an array, holds a non-string, or holds a tag that, after trimming, is longer than
 * MAX_TAG_LENGTH Unicode code points or contains whitespace.
 */
export function normalizeTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== "string") return null;
    const trimmed = tag.trim();
    if (!trimmed) continue;
    if ([...trimmed].length > MAX_TAG_LENGTH || /\s/u.test(trimmed)) return null;
    seen.add(trimmed.toLowerCase());
  }
  return [...seen];
}
