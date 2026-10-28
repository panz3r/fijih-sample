export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: unknown };

export const MAX_TAG_LENGTH = 32;

export class InvalidTagError extends Error {
  constructor() {
    super("invalid tag");
  }
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

/**
 * Trims, lower-cases, and de-duplicates tags (first occurrence wins). `undefined` gives `[]`.
 * Throws InvalidTagError for a non-array, a non-string entry, or a trimmed tag that is empty,
 * longer than MAX_TAG_LENGTH, or contains whitespace.
 */
export function normalizeTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new InvalidTagError();
  const out = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") throw new InvalidTagError();
    const tag = entry.trim().toLowerCase();
    if (tag === "" || tag.length > MAX_TAG_LENGTH || /\s/.test(tag)) throw new InvalidTagError();
    out.add(tag);
  }
  return [...out];
}
