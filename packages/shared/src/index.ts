export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: string[] };

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

export const MAX_TAG_LENGTH = 32;

/**
 * Trims, lower-cases, and deduplicates tags, keeping the order of first appearance.
 * Returns null when `value` is not an array of valid tags: a non-string element, a tag that is empty after trimming,
 * longer than 32 Unicode code points (counted before lower-casing), or containing whitespace.
 */
export function normalizeTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== "string") return null;
    const trimmed = tag.trim();
    if (!trimmed || [...trimmed].length > MAX_TAG_LENGTH || /\s/u.test(trimmed)) return null;
    out.add(trimmed.toLowerCase());
  }
  return [...out];
}
