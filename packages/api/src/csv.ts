import type { Bookmark } from "@sample/shared";

function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function bookmarksToCsv(bookmarks: readonly Bookmark[]): string {
  const rows = [["title", "url", "createdAt"], ...bookmarks.map((b) => [b.title, b.url, b.createdAt])];
  return rows.map((row) => row.map(field).join(",") + "\r\n").join("");
}
