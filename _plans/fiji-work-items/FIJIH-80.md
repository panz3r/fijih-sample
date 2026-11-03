---
schema: fiji/work-item/v1
id: FIJIH-80
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-80
  revision: 2026-11-03T15:01:02.875+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-80-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-80: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-80 (Story, "Add tags to bookmarks"), revision `2026-11-03T15:01:02.875+0100`, no comments, no attachments, no Figma reference.
- Context (from the issue): a bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- Decisions (from the issue): tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Not named by the issue and not yet decided: whether the web page's add form (`packages/web/index.html`, `packages/web/src/main.ts`) gets a tags input. This plan does not add one; tags can be set only through `POST /bookmarks` until the user decides otherwise (see Risks in the Plan result).

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence's position. When `tags` is absent the bookmark's tags are `[]`. The `201` response body includes the normalized `tags`.
2. A tag that, after trimming, is longer than 32 characters or contains whitespace makes `POST /bookmarks` answer `400` with `{"error":"invalid tag"}`, and no bookmark is stored.
3. Proposed, pending the user's confirmation: `tags` present but not an array, an element that is not a string, or a tag that is empty after trimming also answers `400` with `{"error":"invalid tag"}`, and no bookmark is stored.
4. `GET /bookmarks` returns each bookmark's `tags` array (`[]` for a bookmark created without tags).
5. The web page shows each bookmark's tags after its title, joined with `", "` (for example `news, tech`), and renders no tag text or element when the bookmark has no tags.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Shared tag model and normalization (AC: 1, 2, 3, 6)
  - [x] In `packages/shared/src/index.ts`, add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add an exported `MAX_TAG_LENGTH = 32` and a pure `normalizeTags(input: unknown): string[] | null` that returns `[]` for `undefined`, the trimmed, lower-cased, first-occurrence-deduplicated list for a valid array, and `null` for any invalid input (AC 2 and the AC 3 cases).
  - [x] Unit tests in `packages/shared/src/index.test.ts`: trim, lower-case, dedupe (including case-variant duplicates), default `[]`, exactly 32 characters accepted, 33 rejected, inner whitespace (space, tab) rejected, and the AC 3 cases.
- [x] API accepts, validates, stores, and returns tags (AC: 1, 2, 3, 4, 6)
  - [x] In `packages/api/src/store.ts`, `add` calls `normalizeTags(input.tags)`, throws `ValidationError("invalid tag")` on `null`, and stores the result on the bookmark.
  - [x] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add` for `POST /bookmarks`.
  - [x] Store tests in `packages/api/src/store.test.ts`: default `[]`, normalized tags stored, invalid tag throws and stores nothing.
  - [x] HTTP tests in `packages/api/src/app.test.ts`: `POST` with tags returns them normalized; `GET` lists them; invalid tag answers `400` `{"error":"invalid tag"}` and `GET` does not list the rejected bookmark; existing tests keep passing.
- [x] Web page renders tags after the title (AC: 5, 6)
  - [x] In `packages/web/src/render.ts`, after the link append an element (for example `<span class="tags">`) whose text is the tags joined with `", "`, only when `bookmark.tags.length > 0`.
  - [x] Tests in `packages/web/src/render.test.ts`: tags shown after the title as `news, tech`; no tag element when tags are `[]`; update the existing fixture with `tags: []` so it type-checks.
- [x] Root checks and bundle measurement (AC: 6)
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.
  - [x] Run `pnpm build` then `pnpm measure`; when the gzipped web bundle size moves from `measure/baseline.json` (835 bytes), update `web_bundle_gzip_bytes` there in this change, as `AGENTS.md` requires.

## Engineering Context

- Workspace: pnpm; `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web` (`AGENTS.md`).
- `packages/shared/src/index.ts`: `Bookmark` (`id`, `url`, `title`, `createdAt`), `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. Tag normalization belongs here as a pure function next to `normalizeUrl`.
- `packages/api/src/store.ts`: `BookmarkStore.add` validates title, URL, and URL uniqueness, throwing `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 { error: message }`, so `ValidationError("invalid tag")` yields the required body. Validate tags after the existing title and URL checks and before the bookmark is stored, so a request invalid in several ways keeps today's error for title and URL.
- `POST /bookmarks` reads the JSON body as an untyped object, so `normalizeTags` takes `unknown` and checks the array and element types at runtime.
- `packages/web/src/render.ts`: `renderList` builds each `<li>` as a link (title) plus a Remove button; `index.html` styles `li` as a flex row with `justify-content: space-between`. Place the tags element between the link and the button. Use `textContent`, never `innerHTML`, for tag text.
- Adding the required `tags` field to `Bookmark` breaks the type of existing fixtures (`packages/web/src/render.test.ts`); update them in the same task.
- The web add form (`index.html`, `main.ts`) is unchanged by this plan (see Product Context).
- Change intent: `AGENTS.md` requires a changeset in `.changeset/` for a pull request that changes a package, summary `Add tags to bookmarks`; Delivery adds it.

## Testing Strategy

- Unit (Vitest), `packages/shared`: `normalizeTags` happy paths (trim, lower-case, dedupe, default), boundaries (32 vs 33 characters), unhappy paths (inner whitespace, AC 3 cases). Run `pnpm --filter @sample/shared test`.
- Unit and HTTP integration (Vitest), `packages/api`: `BookmarkStore` tag storage and rejection; `createApp` over a real listening server for `POST`/`GET` with tags and the `400` body. Run `pnpm --filter @sample/api test`.
- Unit (Vitest, jsdom), `packages/web`: `renderList` tag text and the no-tags case. Run `pnpm --filter @sample/web test`.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; `pnpm build` then `pnpm measure` for the bundle size.
- No migration (in-memory store), no design source, and no manual or live-app check is planned.

## Operational Requirements

- Required status check `test` on `main` — where: repository ruleset `main` (id 26033321, active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test` (integration 15368), plus a `pull_request` rule requiring 1 approving review and allowing only squash merges; owner: repository admin (`panz3r`). This change adds, removes, or renames no CI check context.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/store.test.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- measure/baseline.json

## Implementation Record

Task 1 — shared tag model and `normalizeTags`

- `Bookmark.tags`, optional `NewBookmark.tags`, `MAX_TAG_LENGTH = 32`, `normalizeTags(unknown)`; 7 new tests; `pnpm --filter @sample/shared test` and `typecheck` pass.

Task 2 — API accepts, validates, stores, and returns tags

- `BookmarkStore.add` validates via `normalizeTags` after title/URL checks (`ValidationError("invalid tag")`); `POST /bookmarks` passes `body.tags`; 5 new tests; `pnpm --filter @sample/api test` and `typecheck` pass.

Task 3 — web page renders tags after the title

- `renderList` appends `<span class="tags">` (via `textContent`) between link and Remove only when tags exist; fixture updated; 2 new tests; `pnpm --filter @sample/web test` and `typecheck` pass.

Task 4 — root checks and bundle measurement

- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` all pass from the root. `pnpm measure` reported `web_bundle_gzip_bytes=881` (delta 46 from 835); `web_bundle_gzip_bytes` in `measure/baseline.json` updated to 881, re-measure delta 0.

Stale-statement sweep — `Bookmark`/`NewBookmark` shape, `POST /bookmarks` body, `createdAt`, web list rendering

- none found (README, scenarios, HTML hits describe unchanged or historical behaviour).

## Validation Evidence

- shared: `pnpm --filter @sample/shared test` passed (10 tests), `typecheck` passed.
- api: `pnpm --filter @sample/api test` passed (9 tests), `typecheck` passed.
- web: `pnpm --filter @sample/web test` passed (4 tests), `typecheck` passed.

- AC-1: passed — shared `normalizeTags` tests, store tests, API test "accepts, normalizes, and lists tags" (201 body has normalized tags).
- AC-2: passed — shared boundary/whitespace tests; API test returns 400 `{"error":"invalid tag"}`, nothing stored.
- AC-3: passed — non-array, non-string element, and empty-after-trim cases in shared and API tests.
- AC-4: passed — API test lists tags; default `[]` in store test.
- AC-5: passed — web render tests (`news, tech` after the title; no `.tags` element when empty).
- AC-6: passed — `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; bundle 881 bytes recorded in `measure/baseline.json`.

## Quality Gate

## Review Record

## Change Log

- 2026-11-03: Plan drafted from FIJIH-80 revision `2026-11-03T15:01:02.875+0100`; issue assigned to the current user.
- Approved: plan-approval — Approve. 1. No form input. 2. Yes, as proposed. 3. All three readings confirmed.
- 2026-11-03: Task 1 implemented (shared tags).
- 2026-11-03: Task 2 implemented (API tags).
- 2026-11-03: Task 3 implemented (web tags).
- 2026-11-03: Task 4 done (root checks, baseline 835 -> 881 bytes); stale-statement sweep found nothing; implementation complete.
