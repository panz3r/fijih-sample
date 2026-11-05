---
schema: fiji/work-item/v1
id: FIJIH-102
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-102
  revision: 2026-11-05T15:02:12.721+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
routing:
  class: standard
  source: rubric
  implementation_tier: standard
quality:
  gate: pending
artifacts:
  branch: FIJIH-102-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-102: Add tags to bookmarks

## Story

As a user who keeps bookmarks,
I want to give each bookmark an optional list of tags and see them on the page,
so that I can group my bookmarks.

## Product Context

Source: Jira [FIJIH-102](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-102) (Story, Medium, no comments), revision `2026-11-05T15:02:12.721+0100`.

- Context (issue): a bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- Decisions (issue): tags are not filterable yet.
- Out of scope (issue): filtering or searching by tag; editing the tags of an existing bookmark.
- No Figma link, attachments, or embedded media.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `"tags"` array of strings. Each tag is trimmed and lower-cased, and duplicates are removed (the first occurrence is kept, in input order). When `tags` is omitted, the bookmark gets `[]`. The `201` response body includes the normalized `tags`.
2. When a tag is longer than 32 characters or contains whitespace after trimming, `POST /bookmarks` answers `400` with `{"error":"invalid tag"}` and creates no bookmark.
3. `GET /bookmarks` returns the `tags` array of each bookmark (`[]` when it has none).
4. The web page shows each bookmark's tags after its title, comma separated. When a bookmark has no tags, the page shows nothing for them (no separator, no empty element text).
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Shared: add tag types and normalization (AC: 1, 2, 5)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags` input to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure `normalizeTags(input)` that trims, lower-cases, and deduplicates (first occurrence kept), returns `[]` for `undefined`, and reports invalid input (a tag over 32 characters or with whitespace after trimming, and the Open questions 1–3 cases at their defaults).
  - [x] Add tests in `packages/shared/src/index.test.ts` for normalization, deduplication, order, the default, and each invalid case.
- [x] API: accept, validate, store, and return tags (AC: 1, 2, 3, 5)
  - [x] In `packages/api/src/store.ts`, normalize tags in `BookmarkStore.add` with `normalizeTags`. On invalid input, throw `ValidationError("invalid tag")` before the bookmark is stored. Store the normalized tags on the bookmark.
  - [x] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add`.
  - [x] Add tests in `packages/api/src/store.test.ts` and `packages/api/src/app.test.ts`: POST with tags returns normalized tags; POST without tags returns `[]`; a tag over 32 characters and a tag with internal whitespace each answer `400 {"error":"invalid tag"}` and the bookmark is not listed; GET returns each bookmark's tags.
- [x] Web: show tags after the title (AC: 4, 5)
  - [x] In `packages/web/src/render.ts`, after the link, append the bookmark's tags joined by the Open question 5 separator. Append nothing when `tags` is empty.
  - [x] Update `packages/web/src/render.test.ts` fixtures for the new `tags` field. Add tests for a bookmark with tags (comma-separated text after the title) and one without (no tags text).
- [ ] Release: re-measure the web bundle (AC: 4)
  - [ ] Run `pnpm build` then `pnpm measure`. When the gzipped web bundle size differs from `measure/baseline.json` (`web_bundle_gzip_bytes: 835`), update `measure/baseline.json` in this change, as `AGENTS.md` requires.
- [ ] Run the repository checks (AC: 5)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.

## Engineering Context

- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, and pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). The API and web packages import `@sample/shared` from source.
  - `packages/api/src/store.ts`: the in-memory `BookmarkStore`. `add` validates the title and URL, throws `ValidationError` on bad input, and builds the stored `Bookmark`.
  - `packages/api/src/app.ts`: a Node `http` router. POST reads the JSON body as `{ url?, title? }`. `ValidationError` maps to `400 { error: message }`, so `ValidationError("invalid tag")` gives exactly `{"error":"invalid tag"}`.
  - `packages/web/src/render.ts`: `renderList` builds one `<li>` per bookmark (link, then Remove button). `main.ts` fetches `GET /bookmarks` and posts the add form.
- Approach: keep tag rules in `shared` as a pure function, as for URL rules. `store.add` stays the single validation point. Check tags after the existing title and URL checks and before the duplicate-URL check, so existing error precedence does not change.
- The store is in memory only, so no data migration is needed. `Bookmark.tags` is required in the type, and every bookmark the store creates carries an array.
- Adding `tags` to `Bookmark` makes the existing test fixture in `packages/web/src/render.test.ts` fail type-checking until it gets `tags`. Update it as part of the web task.
- Lint and type-check: the ESLint flat config and `tsc` run per package (`pnpm lint`, `pnpm typecheck`).
- Change intent (`.changeset/`) is added at Delivery, per `AGENTS.md`, not in this plan's tasks.
- Out of scope, per the issue: filtering or searching by tag (also under Decisions: "Tags are not filterable yet"), and editing the tags of an existing bookmark.

### Open questions

1. When `tags` is present but is not an array, or contains a non-string entry, what does `POST /bookmarks` answer? Default: `400 {"error":"invalid tag"}`.
2. When a tag is empty after trimming (`""` or `"   "`), is it rejected or dropped? Default: rejected with `400 {"error":"invalid tag"}`.
3. Is the 32-character limit checked on the normalized tag (after trimming and lower-casing), and counted in Unicode code points? Default: yes to both.
4. After deduplication, do tags keep their input order (first occurrence), or are they sorted? Default: input order, first occurrence kept.
5. On the page, what is the separator between tags, and where do the tags go? Default: `", "` (comma and space), in one element placed directly after the title link and before the Remove button.
6. Adjacent item: the add form in `packages/web/index.html` and `packages/web/src/main.ts` posts to the same `POST /bookmarks`. Does the form get a tags input in this change? Default: no. The issue asks only that the page shows tags, so tags are set through the API only, and the form keeps posting without `tags` (stored as `[]`).

## Testing Strategy

- Happy path (unit, `packages/shared`): `normalizeTags` trims, lower-cases, deduplicates in first-occurrence order, and returns `[]` for `undefined`. Covers AC 1 and AC 5.
- Unhappy path (unit, `packages/shared` and `packages/api` store): a tag of 33 characters, a tag with internal whitespace, and the Open questions 1–2 cases at their defaults are rejected; a 32-character tag is accepted. In the store, a rejected add leaves the list unchanged. Covers AC 2 and AC 5.
- Integration (`packages/api/src/app.test.ts`, real HTTP server on an ephemeral port): POST with mixed-case, padded, and duplicate tags returns `201` with normalized tags; POST without tags returns `tags: []`; an invalid tag answers `400 {"error":"invalid tag"}` and the bookmark does not appear in `GET /bookmarks`; GET returns each bookmark's tags. Covers AC 1, 2, 3, and 5.
- UI (unit, `packages/web/src/render.test.ts`, jsdom): a bookmark with tags shows them comma separated after the title; a bookmark without tags shows no tags text; Remove still works. Covers AC 4 and AC 5.
- Release: `pnpm build` and `pnpm measure` re-measure the gzipped web bundle, and `measure/baseline.json` is updated when the size moves.
- Commands: `pnpm --filter @sample/shared test`, `pnpm --filter @sample/api test`, `pnpm --filter @sample/web test`, then `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root.

## Operational Requirements

None — this change needs no configuration outside the repository added, changed, or newly relied on.
- Evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned rules `deletion`, `non_fast_forward`, `pull_request`, and `required_status_checks` with contexts `["test"]`. `gh api repos/panz3r/fijih-sample/rulesets` returned one active ruleset, `main`. This change adds, removes, and renames no workflow or job in `.github/workflows/ci.yml`, so the required `test` context is unchanged.
- No new secret, environment, deploy setting, feature flag, or change in another repository: the change is limited to `packages/shared`, `packages/api`, `packages/web`, and `measure/baseline.json`.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/store.test.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts

## Implementation Record

Task 1 — Shared: `Bookmark.tags`, optional `NewBookmark.tags`, and pure `normalizeTags(input: unknown): string[] | null` (`null` means invalid; `undefined` gives `[]`).
- Hypothesis: a single pure function covering the Open questions 1-4 defaults satisfies AC 1 and 2 at the shared level. Confirmed by 8 new tests (12 total in shared).
- Focused: `pnpm --filter @sample/shared test` passed; `pnpm --filter @sample/shared typecheck` passed; `pnpm lint packages/shared` passed.

Task 2 — API: `BookmarkStore.add` normalizes tags with `normalizeTags` after the title and URL checks and before the duplicate-URL check, throwing `ValidationError("invalid tag")`; `app.ts` passes `body.tags`.
- Hypothesis: store-level validation maps to `400 {"error":"invalid tag"}` through the existing `ValidationError` handler. Confirmed by store and HTTP tests.
- Focused: `pnpm --filter @sample/api test` passed (17 tests); `pnpm --filter @sample/api typecheck` passed; `pnpm lint packages/api` passed.

Task 3 — Web: `renderList` appends a `span.tags` with `tags.join(", ")` after the link and before Remove, and nothing when `tags` is empty; existing fixture gets `tags: []`.
- Hypothesis: one conditional element satisfies AC 4 with no stray separator. Confirmed by two new jsdom tests.
- Focused: `pnpm --filter @sample/web test` passed (4 tests); `pnpm --filter @sample/web typecheck` passed; `pnpm lint packages/web` passed.

## Validation Evidence

- AC-1: passed — `packages/api/src/app.test.ts` POST with mixed-case, padded, duplicate tags returns 201 with `["work","home"]`; omitted gives `[]`; shared and store tests pass.
- AC-2: passed — `app.test.ts` 33-character and internal-whitespace tags answer 400 `{"error":"invalid tag"}` and the bookmark is not listed.
- AC-4: passed — `render.test.ts` tags render as `work, home` directly after the title link and before Remove; no `.tags` element and `ExampleRemove` text when none.
- AC-3: passed — `app.test.ts` GET returns each bookmark's `tags` (`[]` when none).

## Quality Gate

## Review Record

## Change Log

- 2026-11-05: Plan drafted from FIJIH-102 at revision `2026-11-05T15:02:12.721+0100`. Issue assigned to the current user.
- 2026-11-05: Approved: plan-approval — Approve with the proposed defaults for all six questions. Nothing to defer or grant. (answering: planned-check question: the plan has no manual, live-app or end-to-end check tasks) (answering: outside-write question: the plan names no writes outside the repository)
- 2026-11-05: Routed: implementation — standard (score 4; source rubric; binding inherit; signals tasks 5, criteria 5, ci_criteria 0, operational_requirements false, integration_or_migration_work true, figma false, open_risks 0, plan_estimate standard, recorded_floor null)
- 2026-11-05: Task 1 implemented (shared tag types and `normalizeTags`).
- 2026-11-05: Task 2 implemented (API accepts, validates, stores, returns tags).
- 2026-11-05: Task 3 implemented (web shows tags after the title).
