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
  phase: qa-review
  checkpoint: null
  transition: quality-gate-recorded
  attempt: 1
quality:
  gate: concerns
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

Gate: concerns. Every criterion has evidence and every required validation passed. Two minor findings remain, and there is no residual risk.

Acceptance trace:

- AC-1: implementation `normalizeTags` in `packages/shared/src/index.ts:47-58` (`[]` for `undefined`; trim, lower-case, first-occurrence dedupe via insertion-ordered `Set`); `BookmarkStore.add` stores it in `packages/api/src/store.ts:21-23`; `POST /bookmarks` passes `body.tags` in `packages/api/src/app.ts:23-24`. Verification: shared "defaults to an empty list" and "trims, lower-cases, and dedupes keeping the first position"; store "defaults tags to an empty list" and "stores normalized tags"; API "accepts, normalizes, and lists tags" (201 body `tags` is `["news","tech"]`).
- AC-2: implementation is the `tag.length > MAX_TAG_LENGTH || /\s/.test(tag)` check in `packages/shared/src/index.ts:54`; `ValidationError("invalid tag")` in `packages/api/src/store.ts:22`, thrown before `items.set`, so nothing is stored. Verification: shared "accepts 32 characters and rejects 33", "applies the length limit after trimming", "rejects inner whitespace" (space, tab); store "rejects an invalid tag and stores nothing"; API "rejects an invalid tag with 400 and stores nothing" (`["a b"]`, 33 characters, then `GET` does not list it). See finding 1 for a boundary case.
- AC-3: implementation is in `packages/shared/src/index.ts:49-54` (non-array, non-string element, empty after trim all return `null`). Verification: shared "rejects non-arrays, non-string elements, and empty tags" (`"news"`, `null`, `{}`, `[1]`, `["ok", null]`, `[""]`, `["   "]`); API test with `"news"`, `[1]`, `[" "]` answers 400 `{"error":"invalid tag"}` and stores nothing. Plan approval confirmed this criterion (Change Log); see finding 2.
- AC-4: `GET /bookmarks` returns the stored `Bookmark` objects, which now always carry `tags` (`packages/api/src/store.ts:23`). Verification: API "accepts, normalizes, and lists tags" (the tagged bookmark lists `["news","tech"]`, and every listed bookmark has an array); store "defaults tags to an empty list".
- AC-5: `renderList` adds `<span class="tags">` after the link, using `textContent` and `", "`, only when `tags.length > 0` (`packages/web/src/render.ts:21-28`). Verification: web "shows tags after the title, joined with a comma and space" (`news, tech`, the next sibling of the link); "renders no tag element when there are no tags" (no `.tags`, item text `ExampleRemove`).
- AC-6: new Vitest tests in all three packages. Re-run at the reviewed head: `pnpm test` passed (shared 10, api 9, web 4), `pnpm lint` passed, `pnpm typecheck` passed. `pnpm build` then `pnpm measure` gave `web_bundle_gzip_bytes=881`, delta 0 against `measure/baseline.json` (881).

Findings:

1. minor — `packages/shared/src/index.ts:54`: the tag length is measured after `toLowerCase()`, not "after trimming" as AC-2 says. When lower-casing makes a tag longer, a valid tag is rejected. Reproduced: `normalizeTags(["İ".repeat(32)])` (32 characters after trimming) returns `null`, so `POST /bookmarks` would answer 400 `invalid tag`, because `"İ".toLowerCase()` is 2 UTF-16 units. Supplementary-plane characters (for example emoji) also count as 2 each, because `.length` counts UTF-16 code units. ASCII tags are not affected. Fix: measure `item.trim()` before lower-casing, and say whether "characters" means code points. Add a test.
2. minor — `_plans/fiji-work-items/FIJIH-80.md:44` and `:38`: AC-3 still reads "Proposed, pending the user's confirmation", and Product Context still says that a tags input on the add form is "not yet decided … until the user decides otherwise". The Change Log entry `Approved: plan-approval — Approve. 1. No form input. 2. Yes, as proposed. 3. All three readings confirmed.` settled both. Fix: remove the pending wording, and record the "no form input" decision under Decisions.

Stale-statement sweep (README, `AGENTS.md`, scenarios, code comments, test descriptions; for `Bookmark`/`NewBookmark`, `POST`/`GET /bookmarks`, list rendering): nothing the change made untrue. The README's `packages/shared` summary does not name tag normalization, but it does not claim to be a complete list.

Residual risks: none.

Required validations not passed: none.

Reviewed head: d3dc1b46cadcb47042c2047118dc79aeb4115ec4

## Review Record

## Change Log

- 2026-11-03: Plan drafted from FIJIH-80 revision `2026-11-03T15:01:02.875+0100`; issue assigned to the current user.
- Approved: plan-approval — Approve. 1. No form input. 2. Yes, as proposed. 3. All three readings confirmed.
- 2026-11-03: Task 1 implemented (shared tags).
- 2026-11-03: Task 2 implemented (API tags).
- 2026-11-03: Task 3 implemented (web tags).
- 2026-11-03: Task 4 done (root checks, baseline 835 -> 881 bytes); stale-statement sweep found nothing; implementation complete.
- Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-03: Quality gate `concerns` recorded at d3dc1b4 (two minor findings, no residual risk).
