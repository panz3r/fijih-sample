export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

const MAX_TAG_LENGTH = 32;

/** Trims, lower-cases, and removes duplicate tags, keeping the first occurrence's position. */
export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
}

/** True for a normalised tag that is non-empty, has no whitespace, and is at most 32 Unicode code points. */
export function isValidTag(tag: string): boolean {
  return tag.length > 0 && !/\s/.test(tag) && [...tag].length <= MAX_TAG_LENGTH;
}

/** Returns the normalised tags, or null when `input` is not an array of valid tag strings. */
export function parseTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  if (!input.every((tag) => typeof tag === "string")) return null;
  const tags = normalizeTags(input as string[]);
  return tags.every(isValidTag) ? tags : null;
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
