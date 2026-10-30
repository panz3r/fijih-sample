export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: string[] };

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

/** Trims and lower-cases each tag, removes duplicates, and sorts the result in ascending code-unit order. */
export function normalizeTags(tags: readonly string[]): string[] {
  const out = new Set<string>();
  for (const tag of tags) {
    out.add(tag.trim().toLowerCase());
  }
  return [...out].sort();
}

/** After trimming, a tag is valid when it is not empty, is at most 32 characters, and holds no whitespace. */
export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TAG_LENGTH && !/\s/.test(trimmed);
}
