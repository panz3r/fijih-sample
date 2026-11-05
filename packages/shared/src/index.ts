export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

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

const MAX_TAG_LENGTH = 32;

/**
 * Trims, lower-cases, and deduplicates tags, keeping first occurrences in input order.
 * `undefined` gives `[]`. Returns null for a non-array, a non-string element, or a tag that is
 * empty, longer than 32 code points, or contains whitespace.
 */
export function normalizeTags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const tags = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const tag = item.trim().toLowerCase();
    if (!tag || [...tag].length > MAX_TAG_LENGTH || /\s/.test(tag)) return null;
    tags.add(tag);
  }
  return [...tags];
}
