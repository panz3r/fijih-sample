export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] };

export const MAX_TAG_LENGTH = 32;

export class InvalidTagError extends Error {
  constructor() {
    super("invalid tag");
  }
}

/**
 * Trims, lower-cases, validates, and deduplicates tags, keeping first-occurrence order.
 * `undefined` gives `[]`. Throws InvalidTagError for a non-array, a non-string element,
 * or a tag that is empty, contains whitespace, or exceeds MAX_TAG_LENGTH code points.
 */
export function normalizeTags(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new InvalidTagError();
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") throw new InvalidTagError();
    const tag = raw.trim().toLowerCase();
    if (tag === "" || /\s/u.test(tag) || [...tag].length > MAX_TAG_LENGTH) throw new InvalidTagError();
    seen.add(tag);
  }
  return [...seen];
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
