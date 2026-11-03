---
schema: fiji/work-item/v1
id: FIJIH-81
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-81
  revision: 2026-11-03T16:41:26.748+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-81-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-81: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

- Source: Jira story FIJIH-81 "Add tags to bookmarks" (type Story, priority Medium, label `scenario-S1`, 0 comments, no attachments or media).
- Context (Jira): "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Jira acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions (Jira): Tags are not filterable yet.
- Out of scope (Jira): Filtering or searching by tag; editing tags of an existing bookmark.
- No Figma or other design reference.

### Open product decisions and scope questions

Each is also asked under the Plan result's risks; the plan's current choice is stated so approval can accept or change it.

1. Add-bookmark form: the page's add form (`packages/web/index.html`, `packages/web/src/main.ts`) has only Title and URL inputs. The issue says the API accepts tags and the page shows them, but does not say whether users can enter tags from the page. This plan leaves the form unchanged (tags can be set only through the API). Is a tags input on the add form in scope?
2. Tags that are empty after trimming (`""`, `"   "`): the issue does not say whether they are rejected or dropped. This plan rejects them with 400 `{"error":"invalid tag"}`.
3. A `tags` value that is not an array of strings (for example `"tags": "work"`, `"tags": [1]`, or `"tags": null`): the issue does not say. This plan answers 400 `{"error":"invalid tag"}`.
4. Interpretation of the Jira criteria: length (≤ 32, counted as JavaScript string length) and whitespace (any character matching `\s`) are checked after trimming; deduplication is applied after lower-casing and keeps the first occurrence's position; the page separator is `", "` (comma and space). Confirm.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field (array of strings). Each tag is trimmed, then lower-cased, then duplicates are removed; the stored and returned bookmark carries the resulting `tags` array. A request without `tags` creates a bookmark with `tags: []`. Example: `["  Work ", "work", "READ"]` is stored and returned as `["work", "read"]`.
2. `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing when any tag, after trimming, is longer than 32 characters or contains whitespace (for example `"two words"` or a 33-character tag). A 32-character tag is accepted.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark created without tags), alongside the existing `id`, `url`, `title`, and `createdAt` fields.
4. The web page shows each bookmark's tags after its title as a single comma-separated text (for example `work, read`), and renders no tags element and no extra text when the bookmark's `tags` array is empty.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour of criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. The web page shows, on each bookmark row after the tag list, how many tags the bookmark has in the form `(<n> tags)` (for example `(2 tags)`), and shows nothing for that count when the bookmark has no tags. A Vitest test in `packages/web` covers it. Interpretation: the count is its own element after the tags element, so criterion 4's comma-separated text stays exactly the tag list; one tag reads `(1 tag)`. Confirm at plan approval.

## Tasks and Subtasks

- [x] Shared tag model and normalisation in `packages/shared/src/index.ts` (AC: 1, 2, 3, 5)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a pure, exported `normalizeTags(input)` that trims, validates (length ≤ 32, no whitespace, after trimming), lower-cases, and deduplicates (keeping first-occurrence order), returning `[]` for `undefined`, and signalling invalid input so the API can answer `invalid tag`. Empty-after-trim tags and a non-array or non-string `tags` value follow the answers to Open product decisions 2 and 3 (current choice: reject as `invalid tag`).
  - [x] Export the 32-character limit as a named constant.
  - [x] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case and surrounding spaces, default `[]`, boundary 32 vs 33 characters, inner whitespace rejected.
- [ ] Store and HTTP handling in `packages/api` (AC: 1, 2, 3, 5)
  - [ ] `BookmarkStore.add` normalises `input.tags` with `normalizeTags` and stores them; invalid tags throw `ValidationError("invalid tag")` before anything is stored.
  - [ ] `createApp` passes `body.tags` from the POST body to `store.add`; the existing `ValidationError` → 400 path returns `{"error":"invalid tag"}`.
  - [ ] Tests in `packages/api/src/store.test.ts` and `packages/api/src/app.test.ts`: POST with tags returns normalised tags; POST without tags returns `tags: []`; GET returns tags per bookmark; an over-long tag and a tag with inner whitespace each answer 400 `{"error":"invalid tag"}` and leave the list unchanged.
- [x] Render tags in `packages/web/src/render.ts` (AC: 4, 5, 6)
  - [x] After the title link, append an element whose text is the bookmark's tags joined with `", "` only when `tags` is non-empty.
  - [x] After the tags element, append a separate count element with text `(<n> tags)` (`(1 tag)` for one) only when `tags` is non-empty (AC 6).
  - [x] Tests in `packages/web/src/render.test.ts`: tags render after the title as `work, read`; a bookmark with `tags: []` renders no tags element; existing fixtures gain `tags`; a two-tag bookmark shows `(2 tags)` after the tag list, a one-tag bookmark `(1 tag)`, and a bookmark with `tags: []` shows no count.
- [ ] Release bookkeeping (AC: 5)
  - [ ] Add a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` whose summary is `Add tags to bookmarks`.
  - [ ] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is non-zero, update `measure/baseline.json` `web_bundle_gzip_bytes` to the measured value in the same change (AGENTS.md).
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record their output in Validation Evidence.

## Engineering Context

- Workspace: pnpm with `packages/shared` (types and pure functions, imported from source by the other two packages via `"exports": { ".": "./src/index.ts" }`), `packages/api` (Node `http`, in-memory `BookmarkStore`), `packages/web` (Vite, vanilla TypeScript, jsdom for Vitest).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. `NewBookmark` must stop being a plain `Pick` once `tags` is optional on input but required on `Bookmark`.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates title then URL then duplicate URL and builds the bookmark; `ValidationError` messages become the 400 body's `error`.
  - `packages/api/src/app.ts` — POST handler casts the body to `{ url?, title? }` and forwards only those; the catch block maps `ValidationError` to 400 and `SyntaxError` to `invalid json`.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with an `<a>` (title) then a Remove `<button>`; tags go between them. `main.ts` fetches `GET /bookmarks` typed as `Bookmark[]`; it needs no change for display.
  - `packages/web/index.html` — `li` is a flex row with `justify-content: space-between`; a third child changes the spacing. Keep any styling change minimal and in the existing `<style>` block.
- Interpretation of the Jira criteria taken in this plan (see Risks for confirmation): whitespace and length are checked on the trimmed tag, because the issue requires trimming and a check on the untrimmed value would reject every tag trimming exists for. Lower-casing happens before deduplication, so tags differing only in case or surrounding spaces are duplicates.
- Validation order in `add` stays title → URL → tags → duplicate URL, so an existing request's error does not change.
- Conventions: ESM with `.ts`/`.js` import suffixes as already used per package; Conventional Commits; one logical change per commit; Vitest test in the package each change touches.
- Dependencies: no new packages.

## Testing Strategy

- Unit (Vitest), per AGENTS.md and AC 5:
  - `packages/shared`: `normalizeTags` happy paths (trim, lower-case, dedupe, order, default `[]`), boundaries (32 accepted, 33 rejected), and unhappy paths (inner space, tab).
  - `packages/api`: `store.test.ts` for normalisation and that an invalid tag stores nothing; `app.test.ts` integration through the real HTTP server for POST with and without tags, GET returning tags, and both 400 `invalid tag` cases.
  - `packages/web`: `render.test.ts` with jsdom for tags present (text after the title, comma separated) and absent (no tags element, no extra text).
- Regression: existing tests keep passing; fixtures that build `Bookmark` literals gain `tags`.
- Package-level commands: `pnpm --filter @sample/shared test`, `pnpm --filter @sample/api test`, `pnpm --filter @sample/web test`; then root `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Bundle size: `pnpm build` then `pnpm measure` (task above); CI's `measure` job reports the same value and never fails on its own.
- No manual, live-app, or end-to-end checks are planned: the issue asks only for unit tests, and AC 4 is fully observable through `renderList` in jsdom.
- No migration: the store is in-memory.

## Operational Requirements

- Merge into `main` requires the `test` status check (GitHub Actions) to pass — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with `[{"context":"test","integration_id":15368}]`; owner: repository admin (`panz3r`). This change does not add, remove, or rename any CI check context.
- Merge into `main` requires a pull request with 1 approving review and allows only squash merges — where: the same ruleset `main` (id 26033321); evidence: the same call returned a `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per AGENTS.md and TEAMS.md the approval comes from the QA Engineer `duckyduff369`.
- Classic branch protection is not used — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned `404 Branch not protected`.
- No secrets, environments, deploy configuration, feature flags, or other repositories are involved.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/store.test.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- packages/web/index.html
- .changeset/add-tags-to-bookmarks.md
- measure/baseline.json

## Implementation Record

Task 1 — shared tag model: `tags` on `Bookmark`, optional `tags` on `NewBookmark`, `MAX_TAG_LENGTH`, and `normalizeTags` (returns `null` for invalid input; empty-after-trim and non-array/non-string input rejected per the plan's choices).
Task 2 — api: `BookmarkStore.add` normalises tags (order title, url, tags, duplicate) and throws `ValidationError("invalid tag")`; `createApp` forwards `body.tags`; store and HTTP tests added.
Task 3 — web: `renderList` appends a `.tags` span (`work, read`) and a separate `.tag-count` span (`(2 tags)`, `(1 tag)`) after the title only when tags exist; `li > a { margin-right: auto }` and `gap` keep the row layout. Tests cover tags, count, singular, and none.
Task 4 — release bookkeeping: changeset `Add tags to bookmarks` (minor for shared, api, web); `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=923`, `web_bundle_gzip_delta=88` against baseline 835, so `measure/baseline.json` is now 923 (re-measure: delta 0). Root `pnpm test` (9 + 10 + 5 tests), `pnpm lint`, and `pnpm typecheck` pass.

Stale-statement sweep — `Bookmark`, `NewBookmark`, `tags`, `invalid tag`, `web_bundle_gzip_bytes`, `GET/POST /bookmarks`, list-row layout

none found (README.md, AGENTS.md, workflows, and package manifests make no statement about bookmark fields or the baseline value that the change contradicts).

## Validation Evidence

AC-1: passed — shared normalizeTags tests and api store/app tests (`pnpm test`: 9 + 10 + 5 passed)
AC-2: passed — api app tests: 400 {"error":"invalid tag"} for 33-character and whitespace tags, list unchanged; 32 characters accepted
AC-3: passed — api app test: GET /bookmarks returns `tags` per bookmark, `[]` by default
AC-4: passed — web render tests: `work, read` after the title, no tags element when empty
AC-5: passed — `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0 from the repository root
AC-6: passed — web render tests: `(2 tags)`, `(1 tag)`, no count when empty

## Quality Gate

## Review Record

## Change Log

- 2026-11-03 — Plan drafted from FIJIH-81 at revision 2026-11-03T16:37:21.007+0100; issue assigned to Mattia Panzeri.
- 2026-11-03 — Source reconciliation: Jira description changed at 2026-11-03T16:39:56.659+0100 (changelog 10289); adopted additive difference: new Jira criterion 6, `Each bookmark row shows how many tags it has, for example "(2 tags)", after the tag list; nothing when it has none.`, recorded as AC 6 with subtasks under the web render task (AC 6). Interpretation to confirm at plan-approval: count is a separate element after the tags element; `(1 tag)` for one. source.revision updated; no existing criterion or task changed.
- 2026-11-03 — Reconciliation risk: Jira description changed at 2026-11-03T16:41:26.748+0100 (changelog 10290) and now adds a seventh criterion, `GET /bookmarks?tag=<tag> returns only the bookmarks that carry that tag (matched after the same normalisation).`, while the unchanged Decisions ("Tags are not filterable yet.") and Out of scope ("Filtering or searching by tag.") sections still exclude it; it also needs new tasks and tests in shared/api. Classified conflicting; work item content and source.revision left unchanged pending the user's decision at source-reconciliation.
- 2026-11-03 — Approved: source-reconciliation — "Keep the plan without AC 7: the filter is out of scope, as the issue's Decisions say."
- 2026-11-03 — Rejected: GET /bookmarks?tag=<tag> filter criterion — Jira description: "GET /bookmarks?tag=<tag> returns only the bookmarks that carry that tag (matched after the same normalisation)." Kept out of scope per the user's decision; source.revision updated to 2026-11-03T16:41:26.748+0100.
- 2026-11-03 — Approved: plan-approval — Approve.
- 2026-11-03 — Implementation complete: tasks 1-4 done, validations recorded; Jira FIJIH-81 moved to In Progress.
