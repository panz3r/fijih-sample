export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export type NewBookmark = Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] };

export const INVALID_TAG_MESSAGE = "invalid tag";

export class InvalidTagError extends Error {}

const MAX_TAG_LENGTH = 32;

/**
 * Trims, lower-cases, and deduplicates tags (first occurrence wins). A missing value is `[]`.
 * Throws InvalidTagError for a non-array value, a non-string element, or a trimmed tag that is empty,
 * longer than 32 code points, or contains whitespace.
 */
export function normalizeTags(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new InvalidTagError(INVALID_TAG_MESSAGE);
  const tags = input.map((tag): string => {
    if (typeof tag !== "string") throw new InvalidTagError(INVALID_TAG_MESSAGE);
    const trimmed = tag.trim();
    if (trimmed === "" || Array.from(trimmed).length > MAX_TAG_LENGTH || /\s/.test(trimmed)) {
      throw new InvalidTagError(INVALID_TAG_MESSAGE);
    }
    return trimmed.toLowerCase();
  });
  return [...new Set(tags)];
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
