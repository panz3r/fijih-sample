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

/** True for the code units `\s` matches plus U+0085 (NEXT LINE), which `trim()` keeps although it is whitespace. */
function isTagSpace(code: number): boolean {
  return (
    (code >= 9 && code <= 13) || code === 32 || code === 133 || code === 160 || code === 5760 ||
    (code >= 8192 && code <= 8202) || code === 8232 || code === 8233 || code === 8239 || code === 8287 ||
    code === 12288 || code === 65279
  );
}

/** Trims `isTagSpace` code units from both ends in linear time, with no per-character allocation. */
function trimTag(tag: string): string {
  let start = 0;
  let end = tag.length;
  while (start < end && isTagSpace(tag.charCodeAt(start))) start++;
  while (end > start && isTagSpace(tag.charCodeAt(end - 1))) end--;
  return tag.slice(start, end);
}

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
    const trimmed = trimTag(tag);
    // A code point is at most 2 UTF-16 units, so a longer string is over the limit; this avoids spreading it.
    if (!trimmed || trimmed.length > MAX_TAG_LENGTH * 2 || [...trimmed].length > MAX_TAG_LENGTH) return null;
    if (/[\s\u0085]/u.test(trimmed)) return null;
    out.add(trimmed.toLowerCase());
  }
  return [...out];
}
