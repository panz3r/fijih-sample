export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: string[] };

const MAX_TAG_LENGTH = 32;

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
 * Normalises a tags input: trims, lower-cases, and drops duplicates keeping the first occurrence.
 * `undefined` gives `[]`. Returns `null` when `tags` is not an array of strings, or a tag is empty,
 * longer than 32 characters, or contains whitespace (all checked after trimming).
 */
export function normalizeTags(tags: unknown): string[] | null {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) return null;
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string") return null;
    const trimmed = tag.trim();
    if (!trimmed || [...trimmed].length > MAX_TAG_LENGTH || /\s/.test(trimmed)) return null;
    const lower = trimmed.toLowerCase();
    seen.add(lower);
  }
  return [...seen];
}
