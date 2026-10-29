---
schema: fiji/work-item/v1
id: FIJIH-49
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-49
  revision: "2026-10-29T17:44:20.074+0100"
lifecycle:
  status: active
  phase: qa-review
  checkpoint: local-qa-review
  transition: qa-reviewed
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-49-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-49: Add tags to bookmarks

## Story

As a bookmarks user,
I want each bookmark to carry an optional list of tags that the API accepts and returns and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

Source: Jira issue FIJIH-49 (Story, priority Medium, label `scenario-S18`), revision `2026-10-29T17:44:20.074+0100`. The issue has no comments, attachments, links, or Figma URL.

From the issue:

- A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- `POST /bookmarks` accepts an optional `"tags"` array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers `400` with `{"error":"invalid tag"}`.
- `GET /bookmarks` returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour.
- Decision: tags are not filterable yet.
- Out of scope: filtering or searching by tag; editing tags of an existing bookmark.

Reading of the issue (not a new decision): because each tag is trimmed, the whitespace and 32-character checks apply to the trimmed tag, so `" work "` is the valid tag `work` and `"two words"` is invalid. Checking before trimming would reject every padded tag and make the trimming rule meaningless.

### Open decisions (to answer at plan approval)

The issue does not settle these. The acceptance criteria below use the proposed answer, marked "proposed", until the user confirms or changes it.

- D1 — Tag input on the web page's add form. The issue says only that the page *shows* tags. Without an input, tags can be set only through the API. Proposed: out of scope (display only).
- D2 — A `tags` value that is not an array of strings (for example `"tags": "work"`, `"tags": [1]`, or `"tags": null`). Proposed: `400 {"error":"invalid tag"}`.
- D3 — A tag that is empty after trimming (`""` or `"   "`). Proposed: `400 {"error":"invalid tag"}` (not silently dropped).
- D4 — Order and length unit. Proposed: tags are returned in first-occurrence order after deduplication, and "longer than 32 characters" counts Unicode code points of the trimmed tag (so exactly 32 is valid).
- D5 — Page separator. Proposed: `", "` (comma and space), for example `work, read`.
- D6 — `README.md` describes `packages/shared` as "URL validation and normalisation, sorting". Proposed: leave `README.md` unchanged (the API endpoint list is unchanged).

## Acceptance Criteria

1. `POST /bookmarks` without a `tags` field answers `201` with a bookmark whose `tags` is `[]`.
2. `POST /bookmarks` with `"tags"` as an array of strings answers `201` with each tag trimmed, lower-cased, and deduplicated (proposed per D4: in first-occurrence order), for example `[" Work ", "work", "READ"]` gives `["work", "read"]`.
3. `POST /bookmarks` answers `400` with `{"error":"invalid tag"}`, and stores no bookmark, when any trimmed tag is longer than 32 characters or contains whitespace (a 32-character tag is accepted); proposed per D2 and D3, also when `tags` is not an array of strings or a tag is empty after trimming.
4. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags stored when it was created.
5. The web page shows each bookmark's tags after its title, joined with a comma (proposed per D5: `", "`), and renders no tag text or tag element for a bookmark with no tags.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 5, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. The change carries a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` whose summary is `Add tags to bookmarks`, and `measure/baseline.json` holds the `web_bundle_gzip_bytes` that `pnpm build` then `pnpm measure` reports on the branch when that value differs from the current baseline (835).

## Tasks and Subtasks

- [x] Shared: tag model and normalisation (AC: 1, 2, 3, 4, 6)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` (or `string[]`) input to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure `normalizeTags(input)` that returns `[]` for `undefined`, trims, lower-cases, and deduplicates (first-occurrence order), and reports an invalid tag (length over 32 code points after trimming, internal whitespace, and per D2/D3 a non-string element, non-array value, or empty tag).
  - [x] Vitest cases in `packages/shared/src/index.test.ts`: default `[]`, trimming, lower-casing, deduplication and order, exactly 32 accepted, 33 rejected, internal whitespace rejected, and the D2/D3 cases.
- [x] API: accept, validate, store, and return tags (AC: 1, 2, 3, 4, 6)
  - [x] Pass `body.tags` from `POST /bookmarks` in `packages/api/src/app.ts` to `BookmarkStore.add`.
  - [x] In `packages/api/src/store.ts`, normalise tags with `normalizeTags`, throw `ValidationError("invalid tag")` for an invalid tag before anything is stored, and store `tags` on the bookmark.
  - [x] Vitest cases in `packages/api/src/app.test.ts`: `201` with `tags: []` when omitted, `201` with normalised tags, `400 {"error":"invalid tag"}` for a 33-character tag, a tag with internal whitespace, and the D2/D3 cases, with the list unchanged after each rejection, and `GET /bookmarks` returning each bookmark's `tags`.
- [x] Web: show tags after the title (AC: 5, 6)
  - [x] In `packages/web/src/render.ts`, append an element after the title link holding the tags joined with the D5 separator, only when the bookmark has tags.
  - [x] Keep the tags visually next to the title in `packages/web/index.html` (the `li` is `display: flex; justify-content: space-between`, which would otherwise centre the tags between the title and the Remove button).
  - [x] Update the existing fixtures in `packages/web/src/render.test.ts` with `tags`, and add cases: tags shown after the title and comma separated, and no tag text or element when `tags` is `[]`.
- [x] Run the root checks `pnpm test`, `pnpm lint`, and `pnpm typecheck` and record their results in Validation Evidence (AC: 6)
- [x] Delivery conventions (AC: 7)
  - [x] Add a changeset in `.changeset/` (`pnpm changeset` or by hand) for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary `Add tags to bookmarks`.
  - [x] Run `pnpm build` then `pnpm measure`, record the output in Validation Evidence, and when `web_bundle_gzip_bytes` differs from 835 update `measure/baseline.json` to the new value in the same change.

## Engineering Context

- Workspace: pnpm; `packages/shared` is imported from source (`exports: ./src/index.ts`) by `packages/api` and `packages/web`. All three packages are `private: true`.
- `packages/shared/src/index.ts` holds the `Bookmark` interface, `NewBookmark = Pick<Bookmark, "url" | "title">`, and pure functions (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag normalisation belongs here as a pure function so `shared` can unit-test it and `api` can use it. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` stays optional on input while `Bookmark.tags` is required.
- `packages/api/src/store.ts` `BookmarkStore.add` validates title, then URL, then duplicate URL, and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 {"error": message}`. Throwing `new ValidationError("invalid tag")` produces exactly the required body. Validate tags after the existing checks and before `this.items.set`, so a rejected request stores nothing.
- `POST /bookmarks` currently casts the body to `{ url?: string; title?: string }` and passes only those; it must pass `tags` through untyped (`unknown`) so the D2 checks see the raw value.
- The store is in memory with no persistence, so there is no data migration; every bookmark created after the change has `tags`.
- `packages/web/src/render.ts` `renderList` builds `li > a + button`; tests run in jsdom (`packages/web/vite.config.ts`). Use `textContent`, not `innerHTML`, for tag text (tags are user input).
- `packages/web/src/main.ts` posts only `title` and `url`; it changes only if D1 brings a tag input into scope.
- Lower-casing uses `String.prototype.toLowerCase()` (locale-independent). Whitespace detection uses `/\s/` on the trimmed tag.
- No new dependencies. No CI, ruleset, or check-context changes.

## Testing Strategy

- Unit (Vitest), per AGENTS.md "every behaviour change comes with a Vitest test in the package it changes":
  - `packages/shared`: `normalizeTags` happy paths (default, trim, lower-case, dedupe, order, 32-character boundary) and unhappy paths (33 characters, internal whitespace, D2/D3 cases).
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port, as the existing `app.test.ts` does: create with and without tags, each rejection answering `400 {"error":"invalid tag"}` with nothing stored, and `GET /bookmarks` returning tags. This is the integration check between `shared` and `api`.
  - `packages/web`: `renderList` in jsdom with and without tags.
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` before every commit; CI runs the same jobs on the pull request.
- Bundle size: `pnpm build` then `pnpm measure` locally; update `measure/baseline.json` when the value moves (AC 7).
- No manual, live-app, or end-to-end check is planned: the page change is a pure render function covered in jsdom, and the API is tested over HTTP.

## Operational Requirements

- Merging into `main` requires the `test` status check (GitHub Actions, integration 15368) — where: repository ruleset `main` (id 26033321, active) on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test`; the `test` job of `.github/workflows/ci.yml` runs on `pull_request`; owner: repository admin (`panz3r`).
- Merging into `main` requires one approving review, squash merge only — where: repository ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; branch protection is not used (`gh api repos/panz3r/fijih-sample/branches/main/protection` answered 404 "Branch not protected"); AGENTS.md and TEAMS.md assign the approval to the QA Engineer `duckyduff369`; owner: repository admin (`panz3r`).

This change adds, removes, or renames no CI check context.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/index.html
- packages/web/src/render.test.ts
- .changeset/add-bookmark-tags.md
- measure/baseline.json

## Implementation Record

Task 1 — Shared: tag model and normalisation. Added `Bookmark.tags`, `NewBookmark.tags?: unknown`, and pure `normalizeTags` (returns `string[]`, or `null` for an invalid tag). Judged on the trimmed, lower-cased tag; length counts code points. Focused: `pnpm --filter @sample/shared test` 9 passed, typecheck passed.
(commit 6e24263)
Task 2 — API: accept, validate, store, and return tags. `POST /bookmarks` passes raw `body.tags`; `BookmarkStore.add` validates after the existing checks and before storing, throwing `ValidationError("invalid tag")`. HTTP tests cover default, normalisation, 32-char boundary, and seven rejections (33 chars, whitespace, non-array, null, non-string, empty, blank) each leaving the list unchanged. Focused: `pnpm --filter @sample/api test` 13 passed.
(commit 4d30432)
Task 3 — Web: show tags after the title. `renderList` appends a `span.tags` (via `textContent`, joined with ", ") only when tags exist; CSS `margin-right: auto` keeps it beside the title. Fixtures updated; two cases added. Focused: `pnpm --filter @sample/web test` 4 passed. D1: no tag input, `main.ts` unchanged.
(commit 214e575)
Task 4 — Root checks. `pnpm test` (shared 9, api 13, web 4 passed), `pnpm lint` (eslint clean), `pnpm typecheck` (clean), all from the repository root.
Task 5 — Delivery conventions. Added changeset `.changeset/add-bookmark-tags.md` (minor for shared, api, web; summary `Add tags to bookmarks`). `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881` and `web_bundle_gzip_delta=46` against 835; baseline updated to 881.
(commit e8b500d)

## Validation Evidence

- AC-1: passed — api test "defaults tags to an empty array".
- AC-2: passed — api test "normalises tags and returns them from GET" (`[" Work ","work","READ"]` gives `["work","read"]`); shared `normalizeTags` tests.
- AC-3: passed — api rejection cases (33 chars, whitespace, non-array, null, non-string, empty, blank) answer 400 `{"error":"invalid tag"}` with the list unchanged; 32 characters accepted.
- AC-4: passed — api test reads tags back from `GET /bookmarks`.
- AC-5: passed — web tests "shows tags after the title, comma separated" and "renders no tag text or tag element without tags".
- AC-6: passed — `pnpm test`, `pnpm lint`, `pnpm typecheck` pass from the root; tests exist in shared, api, and web.
- AC-7: passed — changeset covers the three packages with summary `Add tags to bookmarks`; `pnpm measure` reported `web_bundle_gzip_bytes=881` (delta 46), and `measure/baseline.json` now holds 881.

## Quality Gate

Gate: concerns — every criterion is evidenced and the required validations pass; one minor finding remains.

Acceptance trace (reviewed range `main` afa0afb..e8b500d; QA re-ran `pnpm test` (shared 9, api 13, web 4 passed), `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm build` then `pnpm measure` (`web_bundle_gzip_bytes=881`, delta 0 against the updated baseline) from the root at e8b500d):

- AC-1: implementation `normalizeTags` returns `[]` for `undefined` (`packages/shared/src/index.ts`), `BookmarkStore.add` stores it (`packages/api/src/store.ts`), `POST /bookmarks` passes raw `body.tags` (`packages/api/src/app.ts`); verification api test "defaults tags to an empty array", shared "defaults to an empty array".
- AC-2: implementation trim, `toLowerCase`, `Set` in first-occurrence order (`packages/shared/src/index.ts`); verification api "normalises tags and returns them from GET" (`[" Work ","work","READ"]` → `["work","read"]`), shared "trims, lower-cases, and deduplicates in first-occurrence order".
- AC-3: implementation `normalizeTags` returns `null` for non-array, non-string, empty, whitespace, or over 32 code points; `add` throws `ValidationError("invalid tag")` before `items.set`, mapped to `400`; verification api "accepts a 32-character tag" and seven "rejects … and stores nothing" cases (33 chars, internal whitespace, non-array, null, non-string, empty, blank) each asserting `{"error":"invalid tag"}` and an unchanged list; shared boundary cases including 32 emoji (code points, not UTF-16 units). See finding 1 for a boundary deviation.
- AC-4: implementation `Bookmark.tags: string[]` required and always set in `add`; `list()` returns stored bookmarks; verification api "normalises tags and returns them from GET".
- AC-5: implementation `renderList` appends `span.tags` via `textContent` joined with `", "` after the link only when tags exist (`packages/web/src/render.ts`), CSS `li .tags { margin-right: auto }` keeps it beside the title (`packages/web/index.html`); verification web "shows tags after the title, comma separated" and "renders no tag text or element without tags".
- AC-6: Vitest tests added in shared, api, and web; root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass (Implementation result validations and QA re-run).
- AC-7: `.changeset/add-bookmark-tags.md` lists `@sample/shared`, `@sample/api`, `@sample/web` (minor) with summary `Add tags to bookmarks`; `measure/baseline.json` holds 881, matching `pnpm measure` at e8b500d.

Product decisions D1–D6 checked against the criteria: none contradicts a criterion (D1 `main.ts` unchanged; D2/D3 tested; D4 order tested; D5 separator tested; D6 `README.md` unchanged).

Findings:

1. minor — `packages/shared/src/index.ts` (`normalizeTags`): the 32-code-point limit is checked on the lower-cased tag, not the trimmed tag that AC-3 and D4 name. `toLowerCase` expands `İ` (U+0130) to two code points, so a valid trimmed tag of 32 code points containing it is rejected: `normalizeTags(["İ".repeat(32)])` returns `null` (trimmed length 32, lower-cased length 64), so `POST /bookmarks` answers `400 invalid tag` where AC-3 says a 32-character tag is accepted. Reproduced with a Vitest probe outside the worktree. Fix as a follow-up: measure `[...value.trim()].length` before lower-casing, and add a case for it.

Residual risks: none. No Operational Requirements entry is `evidence: unverified`, no Validation Evidence line is `deferred`, and no criterion is `pending-ci`. The intermediate commits 6e24263 and 4d30432 do not typecheck at the root on their own; pull requests are squash-merged, so `main` never holds them.

Reviewed head: e8b500dc16846e4e14db13f5ad080da8ea5bcf7e

## Review Record

## Change Log

- 2026-10-29 — Plan: drafted from FIJIH-49 revision `2026-10-29T17:44:20.074+0100`; issue assigned to the current user. Open decisions D1 to D6 await plan approval.
- 2026-10-29 — Approved: plan-approval — Approve. Answers: D1 no tag input on the add form; D2 yes, 400 invalid tag; D3 yes, 400 invalid tag; D4 yes to both; D5 yes, join with ", "; D6 leave README.md unchanged.
- 2026-10-29 — Implementation: task 1 done (shared tag model and `normalizeTags`).
- 2026-10-29 — Implementation: task 2 done (API tags).
- 2026-10-29 — Implementation: task 3 done (web tag display).
- 2026-10-29 — Implementation: task 4 done (root checks pass).
- 2026-10-29 — Implementation: task 5 done (changeset and bundle baseline).
- 2026-10-29 — Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-29 — Finalize: reconciled commit citations for tasks 1, 2, 3, and 5 (commits 6e24263, 4d30432, 214e575, e8b500d). Task 4 (root checks) has no committed evidence: its entry was added by e5aa329, which changes only the work item; the task stays checked and is listed as a discrepancy. Set checkpoint local-qa-review and transition qa-reviewed.





