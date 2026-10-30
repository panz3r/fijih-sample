export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: string[] };

/** Untrusted input at the HTTP/store boundary: `tags` is validated at runtime. */
export type NewBookmarkInput = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

const MAX_TAG_LENGTH = 32;

// `\s` and `String.prototype.trim` omit U+0085 (NEXT LINE), so it is added explicitly.
const TAG_WHITESPACE = /[\s\u0085]/;

/** Trims whitespace (including U+0085) from both ends with linear scans. */
function trimTag(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && TAG_WHITESPACE.test(value[start]!)) start++;
  while (end > start && TAG_WHITESPACE.test(value[end - 1]!)) end--;
  return value.slice(start, end);
}

/** True when the tag, after trimming, is non-empty, at most 32 characters, and has no whitespace. */
export function isValidTag(value: string): boolean {
  const tag = trimTag(value);
  return tag.length > 0 && tag.length <= MAX_TAG_LENGTH && !TAG_WHITESPACE.test(tag);
}

/** Trims and lower-cases each tag and drops duplicates, keeping the first occurrence order. */
export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => trimTag(tag).toLowerCase()))];
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
