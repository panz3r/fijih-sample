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
 * Trims, lower-cases, and deduplicates tags, keeping first-occurrence order.
 * Returns `[]` for `undefined` and `null` when the value is not an array or any entry is not a valid tag
 * (not a string, blank, longer than MAX_TAG_LENGTH code points, or containing whitespace).
 */
export function normalizeTags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const tags = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const tag = entry.trim().toLowerCase();
    if (tag === "" || [...tag].length > MAX_TAG_LENGTH || /\s/.test(tag)) return null;
    tags.add(tag);
  }
  return [...tags];
}
