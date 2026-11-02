import { describe, expect, it } from "vitest";
import type { Bookmark } from "@sample/shared";
import { bookmarksToCsv } from "./csv.ts";

const make = (title: string, url: string, createdAt: string): Bookmark => ({ id: "x", title, url, createdAt });

describe("bookmarksToCsv", () => {
  it("writes only the header for an empty list", () => {
    expect(bookmarksToCsv([])).toBe("title,url,createdAt\r\n");
  });

  it("writes columns in order with CRLF terminators and unquoted plain fields", () => {
    const csv = bookmarksToCsv([
      make("B", "https://example.com/b", "2026-01-02T00:00:00.000Z"),
      make("A", "https://example.com/a", "2026-01-01T00:00:00.000Z"),
    ]);
    expect(csv).toBe(
      "title,url,createdAt\r\nB,https://example.com/b,2026-01-02T00:00:00.000Z\r\nA,https://example.com/a,2026-01-01T00:00:00.000Z\r\n",
    );
  });

  it("quotes fields with comma, double quote, CR or LF and doubles inner quotes", () => {
    const csv = bookmarksToCsv([make('a, "b"\r\nc\rd\ne', "https://example.com/", "2026-01-01T00:00:00.000Z")]);
    expect(csv).toBe(
      'title,url,createdAt\r\n"a, ""b""\r\nc\rd\ne",https://example.com/,2026-01-01T00:00:00.000Z\r\n',
    );
  });
});
