---
schema: fiji/work-item/v1
id: FIJIH-73
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-73
  revision: 2026-11-02T19:31:03.625+0100
lifecycle:
  status: active
  phase: automated-review
  checkpoint: null
  transition: delivery-complete
  attempt: 2
quality:
  gate: pass
artifacts:
  branch: FIJIH-73-add-bookmark-tags
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/19
  jira_context_comment_id: null
---

# Work Item FIJIH-73: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags and see them next to its title,
so that I can group related bookmarks.

## Product Context

- Source: Jira story FIJIH-73 "Add tags to bookmarks" (project FIJIH, priority Medium, label `scenario-S1`, no comments, no attachments, no Figma URL).
- Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision in the issue: "Tags are not filterable yet."
- Out of scope per the issue: "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- Open product questions (asked at plan approval, see `risks`): the unit used for the 32-character limit, whether an empty tag is valid, the error for a non-array `tags` value or a non-string element, the order of deduplicated tags, the exact separator on the page, whether the web add form gets a tags input, and whether the number of tags per bookmark is limited.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed, then lower-cased, and the normalised tags are deduplicated. The `201` response body holds the normalised `tags` array; when `tags` is omitted, the bookmark has `tags: []`.
2. When any tag, after trimming, is longer than 32 characters or contains a whitespace character, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores no bookmark.
3. `GET /bookmarks` returns the `tags` array of each bookmark (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, comma separated, and shows nothing for a bookmark with no tags (no tag element and no separator text).
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Add tags to the shared bookmark model (AC: 1, 2, 5)
  - [x] In `packages/shared/src/index.ts`, add `tags: string[]` to `Bookmark` and an optional `tags?: string[]` to `NewBookmark`.
  - [x] Add a pure tag normaliser (for example `normalizeTags`) that trims, lower-cases, and deduplicates tags and reports an invalid tag (longer than 32 characters or containing whitespace after trimming).
  - [x] Add tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication (including duplicates that differ only by case or surrounding spaces), empty input, a 32-character tag accepted, a 33-character tag rejected, an inner space or tab rejected.
- [x] Store normalised tags in the API store (AC: 1, 2, 3, 5)
  - [x] In `packages/api/src/store.ts`, normalise `input.tags` (default `[]`) in `add`, throw `ValidationError("invalid tag")` for an invalid tag before anything is stored, and keep the tags on the stored bookmark.
  - [x] Add tests in `packages/api/src/store.test.ts`: default `[]`, normalised tags stored and listed, an invalid tag rejected with no bookmark added.
- [x] Accept and return tags over HTTP (AC: 1, 2, 3, 5)
  - [x] In `packages/api/src/app.ts`, pass the request body's `tags` to `store.add`, and answer `400 {"error":"invalid tag"}` for an invalid tags value per the answer to the open shape question.
  - [x] Add tests in `packages/api/src/app.test.ts`: `POST` with tags returns `201` and normalised tags; `POST` without tags returns `tags: []`; a too-long tag and a tag with inner whitespace return `400 {"error":"invalid tag"}`; `GET /bookmarks` returns each bookmark's tags.
- [x] Show tags on the web page (AC: 4, 5)
  - [x] In `packages/web/src/render.ts`, render the tags after the title link, joined with the agreed separator, and render no tag element when the list is empty; adjust `packages/web/index.html` styles only if the extra element breaks the row layout.
  - [x] Update the existing fixture in `packages/web/src/render.test.ts` with `tags`, and add tests for a bookmark with several tags (text and position after the title) and for a bookmark with no tags (no tag element, no separator).
- [x] Update the bundle-size baseline (AC: 4)
  - [x] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is not 0, set `measure/baseline.json` `web_bundle_gzip_bytes` to the measured value in its own `chore:` commit.
- [x] Run the repository checks (AC: 5)
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record their results in Validation Evidence.
- [x] Validate tags after the duplicate-URL check (AC: 2, 5; Re-entry 2)
  - [x] In `packages/api/src/store.ts`, move tag validation after the duplicate-URL check so existing error responses keep their order.
  - [x] Add a test in `packages/api/src/store.test.ts` (and one in `app.test.ts` over HTTP) for a duplicate URL plus an invalid tag answering `url already bookmarked`.
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.

## Engineering Context

- Workspace: pnpm with `packages/shared` (types and pure functions, imported from source), `packages/api` (Node `http` service, in-memory `BookmarkStore`), and `packages/web` (Vite page, DOM rendering in `render.ts`, tests under jsdom).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates input and throws `ValidationError`; `app.ts` maps `ValidationError` to `400 {"error": message}`, so `ValidationError("invalid tag")` yields the required body without new error handling.
  - `packages/api/src/app.ts`: `POST /bookmarks` currently reads only `url` and `title` from the body.
  - `packages/web/src/render.ts`: `renderList` builds one `li` per bookmark holding the title link and a Remove button; `index.html` styles `li` as a flex row with `justify-content: space-between`, so a third child sits between the title and the button.
- Validation order in `add`: title, then URL, then duplicate URL exist today; tag validation must run before the bookmark is stored. Which error wins when both the URL and a tag are invalid is not specified; keep existing checks first.
- Trimming before the whitespace check follows the issue: "each tag is trimmed" means surrounding spaces are removed, so only whitespace left inside a trimmed tag makes it invalid.
- Lower-casing uses `String.prototype.toLowerCase()` (locale independent).
- Making `tags` required on `Bookmark` changes the shared type, so every `Bookmark` literal (the web test fixture) must gain `tags`; `main.ts` needs no change because it renders whatever `GET /bookmarks` returns.
- No migration: the store is in memory and starts empty on each run.
- Release: the repository requires a changeset for a pull request that changes a package; its summary is "Add tags to bookmarks". Delivery adds it.
- Local branches `FIJIH-70-add-bookmark-tags`, `FIJIH-71-add-bookmark-tags`, and `FIJIH-72-add-bookmark-tags` belong to other Jira issues; this work item does not stack on them and branches from `main` at `8d4f0ec`.

## Testing Strategy

- Unit tests (Vitest) in each changed package, per `AGENTS.md`:
  - `packages/shared`: tag normaliser happy paths (trim, lower-case, dedupe, empty) and unhappy paths (33 characters, inner space, inner tab), plus the 32-character boundary.
  - `packages/api`: `BookmarkStore` default and normalised tags, rejection without storing; HTTP integration through `createApp()` on an ephemeral port for `POST` with and without tags, both `400 {"error":"invalid tag"}` cases, and `GET /bookmarks` returning tags.
  - `packages/web`: `renderList` under jsdom for several tags after the title and for no tags.
- Package commands: `pnpm --filter @sample/shared test`, `pnpm --filter @sample/api test`, `pnpm --filter @sample/web test`; root `pnpm test`, `pnpm lint`, `pnpm typecheck` before each commit.
- Bundle size: `pnpm build` then `pnpm measure`; update `measure/baseline.json` in the same pull request when it moves.
- No manual, live-app, or end-to-end check is planned; the issue asks for unit tests only.
- CI: the `ci` workflow runs `test`, `lint`, `typecheck`, `measure`, and `scenarios` on every pull request; no acceptance criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) on pull requests into `main` — where: repository ruleset `main` (id 26033321) on panz3r/fijih-sample, enforcement active; evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returned rule `required_status_checks` with `[{"context":"test","integration_id":15368}]`, and `gh api repos/panz3r/fijih-sample/rules/branches/main` returned only rules from ruleset 26033321; `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected"; owner: repository admin (`panz3r`).
- One approving review and squash merge only — where: repository ruleset `main` (id 26033321), rule `pull_request`; evidence: same `gh api repos/panz3r/fijih-sample/rulesets/26033321` call returned `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- The change adds, removes, or renames no CI check context.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/store.test.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/index.html
- packages/web/src/render.test.ts
- measure/baseline.json

## Implementation Record
Task 1 — shared model: added `tags` to `Bookmark`/`NewBookmark` and `normalizeTags` (trim, lower-case, dedupe in first-appearance order; null for non-array, non-string, empty, over 32 code points, or inner whitespace) with tests. `pnpm --filter @sample/shared test`: 10 passed; typecheck passed.
(commit 6147464)
Task 2 — API store: `BookmarkStore.add` normalises `input.tags` (default `[]`), throws `ValidationError("invalid tag")` before storing; tests for default, normalised listing, rejection without storing. `pnpm --filter @sample/api test`: 6 passed; typecheck passed.
(commit 8727de0)
Task 3 — HTTP: `POST /bookmarks` passes `tags` to the store; invalid values (too long, inner whitespace, empty, non-string element, non-array, null) answer `400 {"error":"invalid tag"}`; tests cover POST with/without tags, 400 cases, and GET. `pnpm --filter @sample/api test`: 14 passed; typecheck passed.
(commit 78678d2)
Task 4 — web: `renderList` renders a `span.tags` (tags joined with ", ") right after the title link and nothing for no tags; added a `.tags` style so the row layout holds; fixture and tests updated. `pnpm --filter @sample/web test`: 4 passed; typecheck passed.
(commit f80806a)
Task 5 — baseline: `pnpm build` then `pnpm measure` gave `web_bundle_gzip_bytes=881`, delta 46 from 835; set `measure/baseline.json` to 881. Re-measured after the edit: delta 0.
(commit c21d140)
Task 6 — repository checks: from the repository root `pnpm test` (shared 10, api 14, web 4 passed), `pnpm lint` and `pnpm typecheck` passed. (checked at c21d140)

Task 7 — validation order (Re-entry 2): `BookmarkStore.add` now validates tags after the duplicate-URL check (title, URL, duplicate URL, then tags); tests in `store.test.ts` and `app.test.ts` for a duplicate URL plus an invalid tag answering `url already bookmarked` with nothing added. `pnpm test` (shared 10, api 16, web 4 passed), `pnpm lint`, `pnpm typecheck` passed from the root. Web bundle inputs unchanged, so `pnpm measure` is not re-run.
(commit f037de2)

Stale-statement sweep — `NewBookmark`, `Bookmark` shape, `POST /bookmarks`, `renderList`, `invalid tag`, title/url body fields
none found (README.md line 10 describes the endpoints only and stays true).

Stale-statement sweep — `invalid tag`, `url already bookmarked`, validation order of `BookmarkStore.add` (Re-entry 2)
none found (README.md, AGENTS.md, scenarios/, .github/ state nothing about validation order).

## Validation Evidence

AC-1: passed — shared normalizeTags tests and api store/app tests (`pnpm test`).
AC-2: passed — 400 `{"error":"invalid tag"}` for too long, inner whitespace, empty, non-string, non-array, null; nothing stored; a duplicate URL with an invalid tag still answers `url already bookmarked` (api app and store tests, re-run after Re-entry 2).
AC-3: passed — `GET /bookmarks` returns tags (api app test).
AC-4: passed — web render tests: `span.tags` after the title with ", "; none for no tags.
AC-5: passed — `pnpm test` (shared 10, api 16, web 4), `pnpm lint`, `pnpm typecheck` from the root after Re-entry 2; `pnpm measure` delta 0 after baseline update to 881 (web inputs unchanged since).

## Quality Gate

Gate: pass

Reviewed head: 8b1ea589f1c206d5eae54395e2e0a373246d864b

Scope: the latest Re-entry is `user-request` (Re-entry 2), so the review is scoped to the commits since the previous Reviewed head `3948357` (54d8d38, 358ed86, df38cb6, f037de2, 8b1ea58; product change only in f037de2: `packages/api/src/store.ts`, `store.test.ts`, `app.test.ts`) and to AC-2 and AC-5 (Task 7 maps `AC: 2, 5`, and those commits change the AC-2 and AC-5 Validation Evidence lines). Because product code changed, the adversarial review covered that product diff and what it could break, and the whole branch diff against `main` was re-read; `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm measure` were re-run at the reviewed head. Out-of-scope criteria AC-1, AC-3, AC-4 are traced from their current Validation Evidence lines and were also re-verified by the same runs.

Acceptance trace:
- AC-1 (carried forward, re-verified): implementation `packages/shared/src/index.ts` `normalizeTags` (trim, `toLowerCase`, `Set` dedupe in first-appearance order), `packages/api/src/store.ts` `add` (default `[]`, tags on the stored bookmark), `packages/api/src/app.ts` (passes `body.tags`); verification `packages/shared/src/index.test.ts` "trims, lower-cases, and deduplicates…", "accepts an empty array"; `packages/api/src/store.test.ts` "defaults tags to an empty array and stores normalised tags"; `packages/api/src/app.test.ts` "accepts tags, normalises them, and lists them", "defaults tags to an empty array". Validation Evidence: `AC-1: passed`. At the reviewed head `pnpm test` exit 0 (shared 10, api 16, web 4).
- AC-2 (in scope): implementation `normalizeTags` returns null for a non-array, a non-string element, or a trimmed tag that is empty, over 32 code points, or contains `\s`; `BookmarkStore.add` (`packages/api/src/store.ts:14-32`) now checks title, URL, duplicate URL, then tags (lines 21-22), throwing `ValidationError("invalid tag")` before `items.set`, which `app.ts` maps to `400 {"error":"invalid tag"}`; verification shared tests "accepts 32 characters and rejects 33", "counts Unicode code points…", "rejects inner whitespace and empty tags", "rejects a non-array value and non-string elements"; store tests "rejects an invalid tag without storing the bookmark" and "reports a duplicate URL before an invalid tag" (list length stays 1); app tests "rejects an invalid tags value (%s) and stores nothing" (too long, inner whitespace, empty, non-string element, non-array, null; list length unchanged) and "reports a duplicate URL before an invalid tag" (`400 {"error":"url already bookmarked"}`). Passed at the reviewed head.
- AC-3 (carried forward, re-verified): implementation `GET /bookmarks` returns `store.list()`, whose bookmarks carry `tags`; verification app tests "accepts tags, normalises them, and lists them" and "defaults tags to an empty array" (both read `GET /bookmarks`). Validation Evidence: `AC-3: passed`. Passed at the reviewed head.
- AC-4 (carried forward, re-verified): implementation `packages/web/src/render.ts` appends `span.tags` with `tags.join(", ")` between the title link and the Remove button only when `tags.length > 0`; `packages/web/index.html` `.tags` margin keeps the flex row; verification `packages/web/src/render.test.ts` "shows tags comma separated right after the title" and "shows no tag element or separator text without tags". Validation Evidence: `AC-4: passed`. Passed at the reviewed head. Bundle: `pnpm build` then `pnpm measure` at the reviewed head gave `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0` against `measure/baseline.json`.
- AC-5 (in scope): Vitest tests in `packages/shared`, `packages/api`, and `packages/web` as above; at the reviewed head from the repository root `pnpm test` exit 0 (shared 10, api 16, web 4), `pnpm lint` exit 0, `pnpm typecheck` exit 0.

Findings: none.

Previous finding (gate `concerns` at `3948357`): minor — tag validation ran before the duplicate-URL check in `packages/api/src/store.ts`. Resolved by f037de2: tag validation now follows the duplicate-URL check, and the store and HTTP tests for a duplicate URL plus an invalid tag answer `url already bookmarked` and pass at the reviewed head. Not carried forward.

Stale-statement check: searched the repository outside `_plans/` (`README.md`, `AGENTS.md`, `TEAMS.md`, `scenarios/`, `scripts/`, `.changeset/`, `.github/workflows/`, `.claude/`, source comments, test descriptions) for `invalid tag`, `url already bookmarked`, `duplicate url`, validation order, and `tags`; no statement is made untrue by this change. The work item's Engineering Context ("keep existing checks first") now matches the code.

Residual risks: none.

Unmet required validations: none.

## Review Record

## Change Log
- Approved: plan-approval — Approve, taking your recommendations for all seven questions. Publish: yes.
- Defaults taken at plan approval (recommendations accepted): (1) the 32-character limit counts Unicode code points of the trimmed tag, measured before lower-casing; (2) a tag empty after trimming is rejected with `400 {"error":"invalid tag"}`; (3) a non-array `tags` or a non-string element answers `400 {"error":"invalid tag"}`; (4) deduplicated tags keep the order of first appearance in the request; (5) the page separates tags with ", " in one element right after the title link; (6) the web add form gets no tags input (out of scope); (7) no limit on the number of tags per bookmark.
- Task 1 implemented: shared tag model and normaliser.
- Task 2 implemented: store tags.
- Task 3 implemented: tags over HTTP.
- Task 4 implemented: tags on the page.
- Task 5 implemented: baseline updated.
- Task 6 checks run; stale-statement sweep found nothing; implementation complete.
- Approved: implementation-approval — automatic (no risk triggers)
- Quality gate recorded: concerns (one minor finding) at 3948357.
- Finalize (Local QA review): added `(commit <hash>)` lines under the Implementation Record entries for Tasks 1-5 (routine reconciliation); all tasks and acceptance criteria have committed evidence on the branch; File List matches the 10 non-work-item files in the branch diff; no discrepancies. Checkpoint local-qa-review set.
- Re-entry 2: user-request — checkpoint local-qa-review, presented at branch tip 358ed86, user decision: "Request more work: move tag validation after the duplicate-URL check, so existing error responses keep their order, with a test for a duplicate URL plus an invalid tag. Keep Publish as granted."
- Task 7 implemented: tag validation moved after the duplicate-URL check, with tests.
- Re-entry 2 stale-statement sweep: terms `tags` validation order, `invalid tag`, `url already bookmarked`; none found. Implementation complete; checkpoint implementation-approval set.
- Approved: implementation-approval — automatic (no risk triggers)
- Quality gate recorded: pass (no findings; Re-entry 2 resolved the earlier minor finding) at 8b1ea58.
- Finalize (Local QA review, Re-entry 2): all seven tasks and five acceptance criteria have committed evidence on the branch (Tasks 1-5 and 7 cite their commits, Task 6 cites c21d140, AC-1 to AC-5 have Validation Evidence lines); File List matches the 10 non-work-item files in the branch diff against main; no discrepancies. Checkpoint local-qa-review set, transition qa-reviewed.
- Approved: local-qa-review — automatic (no risk triggers; Publish consent at plan-approval: "Approve, taking your recommendations for all seven questions. Publish: yes."; consent re-affirmed in the user's later message "Keep Publish as granted."; verified at 5afdf56)
- Delivery: changeset `.changeset/fijih-73-add-bookmark-tags.md` added (commit 09d6927), branch pushed, draft pull request #19 opened with `enhancement` label, assignee panz3r, base `main`; Copilot automated review requested (timeline `review_requested` event). No human reviewers requested. No `(verify: ci)` criteria, so transition `delivery-complete`.
