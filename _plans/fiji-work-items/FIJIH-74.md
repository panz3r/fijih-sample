---
schema: fiji/work-item/v1
id: FIJIH-74
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-74
  revision: "2026-11-03T00:42:54.074+0100"
lifecycle:
  status: active
  phase: qa-review
  checkpoint: null
  transition: quality-gate-recorded
  attempt: 2
quality:
  gate: pass
artifacts:
  branch: FIJIH-74-add-tags-to-bookmarks
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-74: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give a bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-74 (Story, Medium), https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-74. No comments, attachments, links, or Figma references.
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue decision: "Tags are not filterable yet."
- Out of scope (issue): filtering or searching by tag; editing tags of an existing bookmark.
- Out of scope (this plan, pending confirmation under Open product decisions): a tags input in the web page's Add form. The issue's criteria cover the API accepting tags and the page displaying them; they do not name a form input.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, duplicates are removed (first occurrence kept, in input order), and the created bookmark returned with `201` carries the resulting `tags`. When `tags` is omitted, the bookmark's `tags` is `[]`.
2. When any tag, after trimming, is longer than 32 characters or contains a whitespace character, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` when it has none).
4. The web page shows each bookmark's tags after its title as one comma-separated text (for example `work, reading`), and renders no tag text or element when the bookmark has no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in AC 1–4, including the unhappy paths of AC 2.
6. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root, and `measure/baseline.json` records the gzipped web bundle size that `pnpm build` then `pnpm measure` prints on this branch (AGENTS.md: a change that knowingly moves the bundle size updates the baseline).

## Tasks and Subtasks

- [x] Shared: add tags to the model and a pure normaliser (AC: 1, 2, 5)
  - [x] `packages/shared/src/index.ts`: add `tags: string[]` to `Bookmark`; make `NewBookmark` carry an optional `tags?: string[]` alongside `url` and `title`.
  - [x] Add an exported constant `MAX_TAG_LENGTH = 32` and a pure function (for example `normalizeTags(input: readonly string[]): string[] | null`, or a function that throws a typed error) that trims, lower-cases, deduplicates preserving first-occurrence order, and reports invalid when a trimmed tag is longer than 32 characters or contains whitespace (`/\s/`).
  - [x] `packages/shared/src/index.test.ts`: tests for trimming, lower-casing, dedup after case folding (`["A", "a", " a "]` → `["a"]`), order preservation, the 32-character boundary (32 valid, 33 invalid), inner whitespace (space, tab) invalid, and empty input → `[]`.
- [x] API: accept, validate, store, and return tags (AC: 1, 2, 3, 5)
  - [x] `packages/api/src/store.ts`: `BookmarkStore.add` normalises `input.tags ?? []` through the shared function and throws `ValidationError("invalid tag")` when it is invalid; the stored bookmark includes `tags`. Keep the existing title, URL, and duplicate-URL checks.
  - [x] `packages/api/src/app.ts`: pass `body.tags` from the parsed JSON to `store.add`; a `tags` value that is not an array of strings is handled per the Open product decisions answer.
  - [x] `packages/api/src/store.test.ts`: tests for default `[]`, normalisation, and `ValidationError("invalid tag")` on a 33-character tag and on an inner-whitespace tag, with nothing stored.
  - [x] `packages/api/src/app.test.ts`: HTTP tests that `POST` with tags returns `201` with normalised tags, `POST` without tags returns `tags: []`, an invalid tag returns `400 {"error":"invalid tag"}`, and `GET /bookmarks` returns each bookmark's tags.
- [x] Web: show tags after the title (AC: 4, 5)
  - [x] `packages/web/src/render.ts`: when `bookmark.tags.length > 0`, append after the title link an element (for example `<span class="tags">`) whose `textContent` is `tags.join(", ")`; append nothing when there are none. Use `textContent`, never `innerHTML`.
  - [x] `packages/web/src/render.test.ts`: update the existing fixture to carry `tags: []`; add tests that a bookmark with `["work", "reading"]` shows `work, reading` after the title and that a bookmark with no tags renders no tags element.
- [x] Update the bundle-size baseline and run the project checks (AC: 6)
  - [x] Run `pnpm build` then `pnpm measure`; write the printed `web_bundle_gzip_bytes` to `measure/baseline.json`.
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.
- [x] Re-entry 2: measure the tag length before lower-casing (AC: 1, 2, 5)
  - [x] `packages/shared/src/index.ts`: in `normalizeTags`, check `MAX_TAG_LENGTH` on the trimmed tag before lower-casing (a 32-character trimmed tag is valid even when its lower-case form is longer); keep the empty and whitespace checks.
  - [x] `packages/shared/src/index.test.ts`: test that `normalizeTags(["İ".repeat(32)])` is accepted and that 33 trimmed characters are still rejected.

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `@sample/api` and `@sample/web`.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. `NewBookmark` must change from a plain `Pick`, because `tags` is required on `Bookmark` but optional on input.
  - `packages/api/src/store.ts`: in-memory `BookmarkStore` (a `Map`); validation throws `ValidationError(message)`, which `app.ts` maps to `400 {"error": message}`. So `ValidationError("invalid tag")` produces the exact body AC 2 asks for.
  - `packages/api/src/app.ts`: `POST /bookmarks` currently reads only `url` and `title` from the body.
  - `packages/web/src/render.ts`: `renderList` builds each `<li>` as title link plus Remove button; `packages/web/index.html` styles `li` as `display: flex; justify-content: space-between`, so the tags element goes between the link and the button (inside the item, after the title).
  - `packages/web/src/main.ts`: fetches `GET /bookmarks` and posts the Add form; no change needed for AC 4.
- Validation interpretation: tags are trimmed before the length and whitespace checks, so leading or trailing whitespace is accepted and removed, and only inner whitespace is rejected; otherwise trimming would have no effect. Length is counted in UTF-16 code units (`string.length`).
- Storage is in memory with no persistence, so there is no data migration; every stored bookmark is created with `tags`.
- The README's API row (`GET/POST /bookmarks`, ...) lists endpoints, not fields; it needs no change.
- Conventions (AGENTS.md): Conventional Commits, one logical change per commit (suggested: `feat:` for shared, api, and web, or one per package; `chore:` for the baseline update); every behaviour change has a Vitest test in its package.
- Change intent: Delivery adds a changeset in `.changeset/` whose summary is "Add tags to bookmarks" (the pull request title `[FIJIH-74] Add tags to bookmarks` without the key). Pull request label: `enhancement` (issue type Story). Reviewers: the Bookmarks team in TEAMS.md; one approval from the QA Engineer `duckyduff369`.

### Open product decisions

Asked under the Plan result's risks; Implementation follows the answers.

1. Web Add form: is a tags input in scope? Proposed: no (the issue's page criterion covers display only).
2. A `tags` value that is not an array of strings (for example `"tags": "work"` or `"tags": [1]`): proposed `400 {"error":"invalid tag"}`.
3. A tag that is empty after trimming (for example `""` or `"  "`): proposed `400 {"error":"invalid tag"}` (alternative: drop it silently).
4. Display separator: proposed `", "` (comma and space), in a separate element after the title link.

## Testing Strategy

- Unit (Vitest, per package, as AGENTS.md requires):
  - `packages/shared`: the tag normaliser's happy paths (trim, lower-case, dedup, order, empty input) and unhappy paths (33 characters, inner space, inner tab, plus the answers to Open product decisions 2 and 3).
  - `packages/api`: `BookmarkStore` tests for the default and the error, and HTTP tests through `createApp` on an ephemeral port for `POST` with and without tags, the `400 {"error":"invalid tag"}` path, and `GET` returning tags.
  - `packages/web`: `renderList` in jsdom with and without tags.
- No manual, live-app, or end-to-end check is planned: the behaviour is covered by the unit tests, and the project has no e2e suite.
- Release checks: root `pnpm test`, `pnpm lint`, `pnpm typecheck`; `pnpm build` and `pnpm measure` for the baseline update (AC 6). CI's `test` job (required) runs the same tests on the pull request.

## Operational Requirements

- Required status check `test` on `main` — where: repository ruleset `main` (id 26033321, enforcement active), panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test` (integration_id 15368), produced by the `test` job of `.github/workflows/ci.yml`, which runs on `pull_request`; this change does not add, remove, or rename check contexts; owner: repository admin (panz3r).
- One approving review and squash-only merge on `main` — where: repository ruleset `main` (id 26033321); evidence: the same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (panz3r).
- No environments, secrets, deploy configuration, or other repositories are involved.

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

Task 1 — Shared: `tags` on `Bookmark`, optional on `NewBookmark`, `MAX_TAG_LENGTH = 32`, and `normalizeTags(input: unknown): string[] | null` (trim, lower-case, dedupe in order; null for non-array, non-string, empty-after-trim, over 32 characters, or inner whitespace, per the approved defaults for Open product decisions 2 and 3). 8 new unit tests.
(commit 085ce64)
shared: `pnpm --filter @sample/shared test` 12 passed.
Task 2 — API: `BookmarkStore.add` normalises `tags ?? []` and throws `ValidationError("invalid tag")`; `POST /bookmarks` passes `body.tags` through (non-array or invalid tags answer 400 `{"error":"invalid tag"}`); stored and listed bookmarks carry `tags`. Store tests and HTTP tests added.
(commit b3d36b2)
api: `pnpm --filter @sample/api test` 16 passed.
Task 3 — Web: `renderList` appends `<span class="tags">` with `tags.join(", ")` (textContent) after the title link when a bookmark has tags, nothing otherwise; fixture updated and two tests added.
(commit ff5a75d)
web: `pnpm --filter @sample/web test` 4 passed.
Task 4 — Baseline: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881` (was 835); `measure/baseline.json` updated to 881; re-running `pnpm measure` reports delta 0.
(commit 8bce3ff)
Root `pnpm test`, `pnpm lint`, `pnpm typecheck` all exit 0.
Stale-statement sweep — Bookmark, NewBookmark, tags, "invalid tag", POST /bookmarks, GET /bookmarks, createdAt
none found (README.md lists endpoints only; scenarios/ notes quote the Jira criteria, a historical input; no documentation, AGENTS.md text, comment, or test description is made untrue).
Task 5 — Re-entry 2: `normalizeTags` checks `MAX_TAG_LENGTH` on the trimmed tag before lower-casing and stores the lower-cased tag (which may then exceed 32 code units); new test that 32 "İ" (trimmed, with surrounding spaces) is accepted and 33 rejected.
(commit a0d0cb7)
shared: 13 passed; root `pnpm test` (shared 13, api 16, web 4), `pnpm lint`, `pnpm typecheck` exit 0; `pnpm build` + `pnpm measure` print 881, delta 0, baseline unchanged.
Stale-statement sweep — normalizeTags, MAX_TAG_LENGTH, lower-cased
none found (scenarios/S1.md quotes the Jira criterion, a historical input; the normaliser doc comment was updated in the change commit).

## Validation Evidence

- AC-1: passed — re-measured after re-entry 2 (a 32-character trimmed tag whose lower-case form is longer is accepted); shared `normalizeTags` tests and API store/HTTP tests (trim, lower-case, dedupe in order, default `[]`, 201 with tags).
- AC-2: passed — re-measured after re-entry 2 (length measured after trimming, before lower-casing); 33-character, inner-whitespace, empty, and non-array/non-string tags give 400 `{"error":"invalid tag"}` and store nothing (store and HTTP tests).
- AC-3: passed — HTTP test: `GET /bookmarks` returns each bookmark's `tags`.
- AC-4: passed — web `renderList` tests: `work, reading` after the title link; no `.tags` element when empty.
- AC-5: passed — Vitest tests added in packages/shared, packages/api, packages/web (shared 13, api 16, web 4 tests pass).
- AC-6: passed — re-run after re-entry 2: root `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0; `pnpm build` + `pnpm measure` print 881 and `measure/baseline.json` is 881.

## Quality Gate

Gate: pass. Every criterion is evidenced, every required validation passed, the earlier `minor` finding is resolved, and no finding or residual risk remains.

Reviewed head: a40bf9b5a39e7a2b251526abf929118bc4764ea1 (scoped review: the latest Change Log entry is the `user-request` Re-entry 2, so the review covers the commits since the previous Reviewed head 8c0412f: 4401377, dd5f2f9, b290bc5, a0d0cb7, a40bf9b. Product change: a0d0cb7 in `packages/shared/src/index.ts` and `packages/shared/src/index.test.ts`; the others change only this work item. In scope: AC-1, AC-2, AC-5 (Task 5's mapping) and AC-6 (its Validation Evidence line changed); AC-3 and AC-4 are carried forward from their Validation Evidence lines. No `Scope change:` entry.)

Acceptance trace:

- AC-1: implementation `packages/shared/src/index.ts` (`normalizeTags`: trim, then length/empty/whitespace checks on the trimmed tag, then lower-case, `Set` dedup in input order), `packages/api/src/store.ts` (`input.tags === undefined ? [] : normalizeTags(...)`, `tags` on the stored bookmark), `packages/api/src/app.ts` (passes `body.tags`). Verification: `packages/shared/src/index.test.ts` (trim and lower-case, dedup after case folding, order, empty input, and the new "measures the length after trimming and before lower-casing": 32 "İ" with surrounding spaces is accepted and returned lower-cased), `packages/api/src/store.test.ts`, `packages/api/src/app.test.ts` (`201` with normalised tags, `[]` when omitted). Reproduced here: `normalizeTags(["  " + "İ".repeat(32) + "  "])` returns one tag of 64 code units (the lower-case form), where the previous head returned `null`.
- AC-2: implementation `normalizeTags` returns `null` when the trimmed tag is empty, longer than `MAX_TAG_LENGTH` (32, measured before lower-casing), or contains `/\s/`, and for non-array or non-string input; `BookmarkStore.add` throws `ValidationError("invalid tag")` before storing; `app.ts` maps it to `400 {"error":"invalid tag"}`. Verification: shared tests (32 accepted, 33 rejected for both `x` and `İ`, length after trimming, inner space and tab rejected, empty, non-array, non-string), store and HTTP `it.each` (nothing stored). Reproduced here: `"İ".repeat(33)` and `"x".repeat(33)` return `null`; `"a b"` returns `null`.
- AC-3: carried forward — Validation Evidence: passed (HTTP test: `GET /bookmarks` returns each bookmark's `tags`); unchanged since 8c0412f, and `pnpm test` passes here.
- AC-4: carried forward — Validation Evidence: passed (web `renderList` tests: `work, reading` after the title link; no `.tags` element when empty); unchanged since 8c0412f, and `pnpm test` passes here.
- AC-5: Vitest tests in all three packages; re-run here: shared 13, api 16, web 4 passed.
- AC-6: re-run here at the reviewed head: root `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0; `pnpm build` exit 0, `pnpm measure` prints `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0`; `measure/baseline.json` holds 881.

Findings: none.

Earlier findings: finding 1 of the previous gate (`minor`, length measured after lower-casing, `packages/shared/src/index.ts:53`) is resolved by a0d0cb7: the check now runs on `trimmed.length` and the new test covers the reproduced input.

Stale statements: none. Searched the repository (outside `_plans/`, skill and APM directories) for `normalizeTags`, `MAX_TAG_LENGTH`, lower-casing, "32 characters", and code units. The `normalizeTags` doc comment was updated in the same commit; the test "accepts 32 characters and rejects 33" stays true; `scenarios/S1.md` quotes the Jira criteria, a scenario input; this work item's Task 1 text and Engineering Context ("Length is counted in UTF-16 code units") stay true.

Other review notes (no finding): the implementation result records that a stored tag can exceed 32 UTF-16 code units when lower-casing expands it (32 "İ" stores 64). This follows the user's Re-entry 2 decision ("measure the tag length after trimming and before lower-casing"), AC-1 and AC-2 bound only the trimmed input, and no code reads a stored tag's length (storage is an in-memory `Map`; the page joins tags as text), so it is neither a finding nor a residual risk. Lower-casing adds no whitespace, so the whitespace check on the trimmed form is equivalent. Dedup still uses the lower-case form (`"İ"` and `"i̇"` collapse to one tag). No CI-deferred, `not-run`, or pre-existing-failure validations; no `(verify: ci)` criteria; Operational Requirements entries carry evidence.

Residual risks: none.

## Review Record

## Change Log

- 2026-11-03: Plan drafted from FIJIH-74 at revision 2026-11-03T00:42:54.074+0100; issue assigned to Mattia Panzeri.
- 2026-11-03: Approved: plan-approval — Approve with the proposed defaults. Publish: yes. Notify: yes.
- 2026-11-03: Implementation complete; Jira FIJIH-74 moved to In Progress.
- 2026-11-03: Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-03: Finalize: added commit citations (085ce64, b3d36b2, ff5a75d, 8bce3ff) to the four task entries in Implementation Record (routine reconciliation); each task's entry was added by its own commit; no task or evidence discrepancies; File List matches the branch diff; checkpoint set to local-qa-review.
- 2026-11-03: Re-entry 2: user-request — checkpoint local-qa-review, presented at branch tip dd5f2f9: "Request the fix first: measure the tag length after trimming and before lower-casing, with a test for it. Keep Publish and Notify as granted."
- 2026-11-03: Approved: implementation-approval — automatic (no risk triggers)
