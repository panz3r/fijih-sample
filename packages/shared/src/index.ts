export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

/** Longest allowed tag, in Unicode code points, after trimming and lower-casing. */
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
 * Trims and lower-cases each tag and drops duplicates, keeping input order and first occurrences.
 * Returns null when `tags` is not an array of strings, or a tag is empty, contains whitespace,
 * or is longer than MAX_TAG_LENGTH code points. `undefined` means no tags.
 */
export function normalizeTags(tags: unknown): string[] | null {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) return null;
  const out = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string") return null;
    const normalized = tag.trim().toLowerCase();
    if (!normalized || /\s/.test(normalized) || [...normalized].length > MAX_TAG_LENGTH) return null;
    out.add(normalized);
  }
  return [...out];
}
