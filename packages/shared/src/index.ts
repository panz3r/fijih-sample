export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

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

/** Returns true when the tag is non-empty, at most 32 characters, and has no whitespace. Expects an already trimmed tag. */
export function isValidTag(tag: unknown): tag is string {
  return typeof tag === "string" && tag.length > 0 && [...tag].length <= MAX_TAG_LENGTH && !/\s/.test(tag);
}

/**
 * Trims, validates, lower-cases, and deduplicates tags, keeping the first occurrence's position.
 * Returns `[]` for `undefined` and `null` when the value is not an array of valid tags.
 */
export function normalizeTags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!isValidTag(trimmed)) return null;
    const tag = trimmed.toLowerCase();
    if (!out.includes(tag)) out.push(tag);
  }
  return out;
}
