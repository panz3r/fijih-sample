---
schema: fiji/work-item/v1
id: FIJIH-100
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-100
  revision: 2026-11-05T11:53:51.680+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
  attempt: 1
routing:
  class: deep
  source: rubric
  implementation_tier: deep
quality:
  gate: pending
artifacts:
  branch: FIJIH-100-add-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-100: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags that the API stores and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-100 "Add tags to bookmarks" (Story, Medium, label `scenario-S20`). No comments, no attachments, no Figma link.
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Issue decisions: tags are not filterable yet.
- Issue out of scope: filtering or searching by tag; editing tags of an existing bookmark.

## Acceptance Criteria

1. `POST /bookmarks` with no `tags` field creates the bookmark with `tags: []`, and the 201 response body includes `tags: []`.
2. `POST /bookmarks` with a `tags` array of strings stores each tag trimmed and lower-cased, with duplicates (compared after trimming and lower-casing) removed, keeping the order of first occurrence; for example `[" Work ", "work", "Read"]` is stored and returned as `["work", "read"]`.
3. `POST /bookmarks` answers 400 with body `{"error":"invalid tag"}`, and stores nothing, when any tag, after trimming, is longer than 32 characters (counted in Unicode code points) or contains a whitespace character; a trimmed tag of exactly 32 characters is accepted.
4. `POST /bookmarks` answers 400 with body `{"error":"invalid tag"}`, and stores nothing, when `tags` is present but is not an array of strings (for example a string, `null`, or an array holding a number), or when any tag is empty after trimming (Open questions 2 and 3, at their defaults).
5. `GET /bookmarks` returns the stored `tags` array of each bookmark.
6. The web page shows each bookmark's tags after its title and before its Remove button, joined by `", "` (for example `work, read`); for a bookmark with no tags it renders no tag element and no separator text.
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build && pnpm measure` prints on this branch (`web_bundle_gzip_delta=0`), per the AGENTS.md rule that a change which knowingly moves the bundle size updates the baseline.

## Tasks and Subtasks

- [x] Add tags to the shared model and a pure tag normaliser in `packages/shared/src/index.ts` (AC: 1, 2, 3, 4)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` (or `readonly string[]`) input to `NewBookmark`.
  - [x] Export `MAX_TAG_LENGTH = 32` and `normalizeTags(value: unknown): string[] | null`: `undefined` returns `[]`; a non-array, a non-string entry, or a tag that after trimming is empty, longer than 32 code points, or contains `/\s/` returns `null`; otherwise returns the trimmed, lower-cased tags deduplicated in first-occurrence order.
  - [x] Vitest cases in `packages/shared/src/index.test.ts`: default, trim and lower-case, dedupe after case-folding and order, 32 vs 33 characters, inner whitespace, empty after trim, non-array, non-string entry.
- [x] Store and validate tags in the API (AC: 1, 2, 3, 4, 5)
  - [x] In `packages/api/src/store.ts` `add`, call `normalizeTags(input.tags)` and throw `ValidationError("invalid tag")` on `null`, after the existing title and URL checks and before the bookmark is stored; save the normalised `tags` on the bookmark.
  - [x] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add` unchanged (the body type gains `tags?: unknown`).
  - [x] Vitest cases in `packages/api/src/store.test.ts` (default `[]`, normalisation, rejection leaves the list unchanged) and `packages/api/src/app.test.ts` (201 body with normalised tags, `GET /bookmarks` returns them, 400 `{"error":"invalid tag"}` for a 33-character tag, a tag with inner whitespace, and a non-array `tags`).
- [x] Render tags on the web page in `packages/web/src/render.ts` (AC: 6)
  - [x] When `bookmark.tags.length > 0`, append after the link a `<span class="tags">` whose `textContent` is `tags.join(", ")`; render nothing extra when the list is empty. Use `textContent`, never `innerHTML`.
  - [x] Vitest cases in `packages/web/src/render.test.ts`: tags shown after the title and before Remove, joined by `", "`; no `.tags` element for an empty list. Add `tags` to the existing fixture so it type-checks.
- [x] Run the root checks `pnpm test`, `pnpm lint`, and `pnpm typecheck` and fix what they report (AC: 7)
- [x] Run `pnpm build` then `pnpm measure`, and set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed `web_bundle_gzip_bytes` when the delta is not 0, in the same change (AC: 8)

## Engineering Context

- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark` (id, url, title, createdAt), `NewBookmark = Pick<Bookmark, "url" | "title">`, and pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Imported from source by api and web (`"exports": { ".": "./src/index.ts" }`).
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title, then URL, then duplicate URL, and throws `ValidationError(message)`; `app.ts` maps `ValidationError` to `400 {"error": message}`, so `ValidationError("invalid tag")` yields the required body with no change to the error mapping.
  - `packages/api/src/app.ts`: `POST /bookmarks` builds `{ url, title }` from the parsed body; it must forward `tags`.
  - `packages/web/src/render.ts`: `renderList` builds each `<li>` as `<a>` (title) then the Remove `<button>`; tags go between them. `packages/web/src/main.ts` needs no change, since it renders whatever `GET /bookmarks` returns.
- Conventions: ESM TypeScript; api imports `.ts` paths, web and shared import `.js` paths; Vitest per package (web uses jsdom); test files sit under `src` and are type-checked. Commits follow Conventional Commits (`feat:` for this change), one logical change per commit.
- Validation order: title, URL, duplicate URL, then tags, so existing error messages keep their precedence.
- Data: the store is in memory, so there is no stored data to migrate; every bookmark created after this change has a `tags` array.
- Change intent: AGENTS.md requires a changeset in `.changeset/` for a pull request that changes a package, with summary `Add tags to bookmarks`; Delivery adds it with the change intent, so it is not an Implementation task.
- Out of scope (from the issue): filtering or searching by tag, editing tags of an existing bookmark.

### Open questions

1. Should the web page's add form get a tags input, so tags can be set from the page? The issue asks the page only to show tags, and `main.ts` posts `{ title, url }`. (default: no; tags are set through the API only, and the form keeps creating bookmarks with no tags)
2. When `tags` is present but is not an array of strings (a string, `null`, an object, or an array holding a non-string), what should `POST /bookmarks` answer? (default: 400 `{"error":"invalid tag"}`)
3. Is a tag that is empty after trimming (`""` or `"   "`) invalid or silently dropped? (default: invalid, 400 `{"error":"invalid tag"}`)
4. Is the 32-character limit counted on the trimmed tag, in Unicode code points (so an emoji counts as one)? (default: yes, on the trimmed tag, in code points)
5. In what order are tags stored and shown after deduplication? (default: the order of first occurrence in the request)
6. What exactly separates tags on the page? (default: a comma and a space, `work, read`)

## Testing Strategy

- Unit (happy): `packages/shared` `normalizeTags` default, trim, lower-case, dedupe and order; `packages/api` store and HTTP round trip (`POST` then `GET /bookmarks`) with tags and without; `packages/web` `renderList` with tags.
- Unit (unhappy): 33-character tag, inner whitespace, empty-after-trim, non-array and non-string entries answer 400 `{"error":"invalid tag"}` and leave the list unchanged; a 32-character tag is accepted; `renderList` with an empty tag list renders no tag element.
- Integration: `packages/api/src/app.test.ts` runs the real `http` server on an ephemeral port, covering the request body through the store to the JSON response.
- Release: bundle size measured with `pnpm build && pnpm measure` and the baseline updated (AC 8); the changeset is added at Delivery.

## Operational Requirements

None — this change needs no configuration outside the repository added, changed, or newly relied on.
- Evidence: `gh api repos/panz3r/fijih-sample/rulesets` lists one active ruleset `main` (id 26033321, target `~DEFAULT_BRANCH`) requiring squash merge, 1 approving review, and status check context `test`; the change keeps the `ci` workflow's jobs (`test`, `lint`, `typecheck`, `measure`, `scenarios`) as they are, so no required check context is added, removed, or renamed.
- Evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` answers 404 "Branch not protected" (no classic branch protection to change).
- No secret, environment, deploy setting, or other repository is used by the change: it touches only `packages/shared`, `packages/api`, `packages/web`, and `measure/baseline.json`.

## File List

- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`
- `packages/api/src/store.ts`
- `packages/api/src/app.ts`
- `packages/api/src/store.test.ts`
- `packages/api/src/app.test.ts`
- `packages/web/src/render.ts`
- `packages/web/src/render.test.ts`
- `measure/baseline.json`

## Implementation Record

Task 1 — shared tags model and normalizeTags
Added `tags: string[]` to `Bookmark`, `tags?: unknown` to `NewBookmark`, `MAX_TAG_LENGTH = 32`, and `normalizeTags` with 7 Vitest cases. Shared test (11 passed), typecheck, and lint pass.
Task 2 — API stores and validates tags
`BookmarkStore.add` normalises tags after title/URL/duplicate checks and throws `ValidationError("invalid tag")`; `POST /bookmarks` forwards `body.tags`. API test (19 passed), typecheck, and lint pass.
Task 3 — web page renders tags
`renderList` appends a `span.tags` (textContent `tags.join(", ")`) between the title link and Remove when tags exist. Web test (4 passed), typecheck, and lint pass.
Task 4 — root checks
(checked at a6087da)
`pnpm test`, `pnpm lint`, `pnpm typecheck` from the root all exit 0; nothing to fix.
Task 5 — bundle baseline
`pnpm build && pnpm measure` printed web_bundle_gzip_bytes=881 (delta 46 against 835); baseline set to 881, re-measure prints delta 0.

Stale-statement sweep — Bookmark shape, NewBookmark, POST /bookmarks, renderList, web_bundle_gzip_bytes, createdAt
none found (README.md route list is still accurate).

## Validation Evidence

AC-1: passed — api store.test.ts and app.test.ts default `tags: []`.
AC-2: passed — shared normalizeTags and api tests: `[" Work ", "work", "Read"]` gives `["work","read"]`.
AC-3: passed — shared, store, and app tests: 33 characters and inner whitespace give 400 `invalid tag`; 32 accepted.
AC-4: passed — non-array, null, number entry, and empty-after-trim give 400 `invalid tag`.
AC-5: passed — app.test.ts GET /bookmarks returns tags.
AC-6: passed — web render.test.ts: order A, SPAN, BUTTON, text `work, read`; no `.tags` when empty.
AC-7: passed — root `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0 at e2b4ad8.
AC-8: passed — `pnpm measure` prints web_bundle_gzip_bytes=881, web_bundle_gzip_delta=0.

## Quality Gate

## Review Record

## Change Log

- Approved: plan-approval — Approve with the proposed defaults for Q1–Q6. Nothing to defer or grant.
- Routed: implementation — deep (score 5; source rubric; binding inherit)
