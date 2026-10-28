---
schema: fiji/work-item/v1
id: FIJIH-44
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-44
  revision: "2026-10-28T22:54:03.939+0100"
lifecycle:
  status: active
  phase: qa-review
  checkpoint: null
  transition: quality-gate-recorded
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-44-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-44: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give a bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

Source: Jira story [FIJIH-44](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-44) "Add tags to bookmarks" (Story, priority Medium, label `scenario-S1`, 0 comments, no attachments, no Figma link).

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions: Tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.

### Open product decisions

The issue does not settle these. The plan uses the proposed answer in brackets until the user confirms or changes it at plan approval (each is also listed under the Plan result's risks):

- D1. A `tags` value that is not an array, or an array element that is not a string. [Proposed: answer 400 `{"error":"invalid tag"}`.]
- D2. A tag that is empty after trimming (`""` or `"   "`). [Proposed: answer 400 `{"error":"invalid tag"}`.]
- D3. Whether the 32-character limit is measured before or after trimming. [Proposed: after trimming; exactly 32 characters is accepted, 33 is rejected.]
- D4. Order of tags after deduplication. [Proposed: keep the order of first occurrence.]
- D5. Display format on the page. [Proposed: tags joined with `", "` in their own element directly after the title link and before the Remove button; no element and no text at all when the list is empty.]
- D6. A maximum number of tags per bookmark. [Proposed: no limit.]
- D7. When `title` or `url` is also invalid, which error wins. [Proposed: keep the existing order (title, then url), then tags, then the duplicate-url check.]

### Adjacent items not named by the issue

- Tag input on the web add form (`packages/web/index.html`, `packages/web/src/main.ts`): the issue says the API accepts tags and the page *shows* them, but does not say the page lets a user *enter* tags. Is a tags input on the add form in scope? [Plan assumes no: display only.]
- `measure/baseline.json`: the page change moves the gzipped web bundle size; AGENTS.md requires a pull request that knowingly moves it to update the baseline in the same change. In scope (task 4).
- Changeset: AGENTS.md requires one for a pull request that changes a package; Delivery (`fiji-deliver-change`) adds it, summary "Add tags to bookmarks".
- `DELETE /bookmarks/:id` and `GET /health`: unaffected.

## Acceptance Criteria

1. `POST /bookmarks` without a `tags` field answers 201 with a bookmark whose `tags` is `[]`.
2. `POST /bookmarks` with `tags` answers 201 with each tag trimmed, lower-cased, and deduplicated after normalisation (for example `[" News", "news", "Tech "]` → `["news", "tech"]`), keeping the order of first occurrence (D4).
3. `POST /bookmarks` with a tag longer than 32 characters after trimming, or containing whitespace after trimming, answers 400 `{"error":"invalid tag"}` and stores nothing; a tag of exactly 32 characters is accepted (D3).
4. `POST /bookmarks` with a `tags` value that is not an array, an element that is not a string, or a tag that is empty after trimming answers 400 `{"error":"invalid tag"}` and stores nothing (D1, D2).
5. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the normalised tags it was created with.
6. The web page shows each bookmark's tags after its title, joined with `", "`, and renders no tags element and no extra text for a bookmark with no tags (D5).
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build && pnpm measure` prints on this branch (delta 0).

## Tasks and Subtasks

- [x] 1. Shared tag model and normalisation in `packages/shared` (AC: 2, 3, 4, 7)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` input to `NewBookmark`.
  - [x] Add a pure `normalizeTags(value: unknown)` that returns `[]` for `undefined`, the trimmed, lower-cased, first-occurrence-deduplicated list for a valid array, and signals invalid input (not an array, non-string element, empty after trim, whitespace inside, longer than 32) without throwing a transport error; export the 32 limit as a constant.
  - [x] Vitest cases in `packages/shared/src/index.test.ts`: default, trim, lower-case, dedupe after normalisation, order kept, 32 accepted, 33 rejected, inner whitespace (space, tab) rejected, empty and whitespace-only rejected, non-array and non-string rejected.
- [x] 2. Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 4, 5, 7)
  - [x] `BookmarkStore.add` validates tags with `normalizeTags` after the title and url checks, throws `ValidationError("invalid tag")` when invalid, and stores the normalised list on the bookmark.
  - [x] `app.ts` passes `body.tags` through to `store.add`.
  - [x] Vitest cases in `packages/api/src/app.test.ts`: POST without tags → `tags: []`; POST with mixed-case, padded, duplicated tags → normalised; each invalid case → 400 `{"error":"invalid tag"}` and the list is unchanged; GET returns the tags of each bookmark.
- [x] 3. Show tags on the page in `packages/web` (AC: 6, 7)
  - [x] `renderList` appends an element holding `tags.join(", ")` after the title link when the bookmark has tags, and nothing when it has none.
  - [x] Update existing `render.test.ts` fixtures for the new required `tags` field; add cases for tags shown after the title, comma separated, and for no tags element when empty.
- [x] 4. Update the bundle-size baseline (AC: 8)
  - [x] Run `pnpm build` then `pnpm measure`; write the printed `web_bundle_gzip_bytes` into `measure/baseline.json` in its own `chore:` commit, and re-run `pnpm measure` to confirm delta 0.
- [x] 5. Live-app check (AC: 1, 2, 5, 6)
  - [x] Start the API (`pnpm --filter @sample/api start`) and the web dev server (`pnpm --filter @sample/web dev`); create one bookmark with tags `[" News", "news", "Tech "]` and one without via `curl` against the API; confirm `GET /bookmarks` shows `["news","tech"]` and `[]`, and the page shows "news, tech" after the first title and nothing extra after the second. Record the commands and output in Validation Evidence.
- [x] 6. Run the full checks from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 7)

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `@sample/api` and `@sample/web`. ESM with `.js` suffixes in relative imports. Node ≥ 24, TypeScript 5.9, Vitest 3 (web tests run in `jsdom`, `packages/web/vite.config.ts`).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, and the pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`); tag normalisation belongs here as a pure function.
  - `packages/api/src/store.ts` — `BookmarkStore.add` does validation and throws `ValidationError(message)`; the in-memory `Map` needs no migration.
  - `packages/api/src/app.ts` — maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` yields the required body. `readJson` casts the body; `tags` must be read as `unknown`, not trusted as `string[]`.
  - `packages/web/src/render.ts` — `renderList` builds each `<li>` as title link + Remove button; `li` uses `display: flex; justify-content: space-between` (`packages/web/index.html`), so the tags element should sit with the link (for example wrapped with it) to stay next to the title rather than being pushed to the middle. Use `textContent`, never `innerHTML`, for tag text.
  - `packages/web/src/main.ts` — fetches `/bookmarks` and calls `renderList`; no change needed for display.
- Making `Bookmark.tags` required changes the shared type: every `Bookmark` literal (the web test fixture) must add `tags`.
- "Containing whitespace" is tested with `/\s/` on the trimmed tag; length is the trimmed string's `length`.
- Commits: Conventional Commits, one logical change per commit (for example `feat: normalise bookmark tags in shared`, `feat: accept and return bookmark tags in the api`, `feat: show bookmark tags on the page`, `chore: update the web bundle baseline`), each with its tests.
- Delivery: PR title `[FIJIH-44] Add tags to bookmarks`, label `enhancement` (Story), a changeset for `@sample/shared`, `@sample/api`, `@sample/web` with summary "Add tags to bookmarks", reviewer `duckyduff369` (QA Engineer, TEAMS.md).

## Testing Strategy

- Unit (shared): table of valid and invalid inputs to `normalizeTags`, covering happy path (default, trim, lower-case, dedupe, order) and unhappy paths (33 characters, inner whitespace, empty, whitespace-only, non-array, non-string). Boundary at 32/33 characters.
- Integration (api): HTTP tests through `createApp` on an ephemeral port, as in the existing `app.test.ts`: 201 with default and normalised tags, each 400 `{"error":"invalid tag"}` case leaves `GET /bookmarks` unchanged, and `GET` returns tags. Use URLs distinct from the existing tests since the server instance is shared within the file.
- Unit (web): `renderList` in jsdom — tags appear after the title joined with `", "`; no tags element or extra text when empty; the existing empty-state and Remove tests still pass.
- Live-app check: task 5.
- Bundle size: task 4 (local `pnpm build` + `pnpm measure`); the CI `measure` job reports the same number but no criterion depends on CI alone.
- No migration (in-memory store) and no design source (no Figma link).

## Operational Requirements

- The pull request must pass the required status check `test` (the `test` job of `.github/workflows/ci.yml`, which runs `pnpm test` on `pull_request`) — where: GitHub repository ruleset `main` (id 26033321, enforcement active, target `~DEFAULT_BRANCH`); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `required_status_checks: [{context: "test", integration_id: 15368}]`, and `gh api repos/panz3r/fijih-sample/rules/branches/main` returns the same rule; owner: repository administrators of `panz3r/fijih-sample` (`panz3r`).
- The pull request needs one approving review and merges by squash only — where: same ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `pull_request.required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: repository administrators (`panz3r`). Per TEAMS.md/AGENTS.md the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` → 404 "Branch not protected".
- This change adds, removes, or renames no CI check contexts; no secrets, environments, deploy configuration, or other repositories are involved.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- packages/web/index.html
- measure/baseline.json

## Implementation Record

- Task 1: `normalizeTags(value: unknown): string[] | null` (null = invalid) and `MAX_TAG_LENGTH = 32` in shared; `Bookmark.tags` required, `NewBookmark.tags?: unknown`. Hypothesis: a Set keeps first-occurrence order and dedupes after normalisation; confirmed by the shared tests (10 pass).
- Task 2: `BookmarkStore.add` calls `normalizeTags` after the title and url checks and before the duplicate-url check (D7); invalid gives `ValidationError("invalid tag")`, which `app.ts` already maps to 400. `app.ts` passes `body.tags` as `unknown`. Hypothesis (no stored state on invalid input, since validation precedes `items.set`) confirmed by the "stores nothing" tests.
- Observation: the existing test "creates, lists newest first, and deletes" is flaky (about 1 in 12 runs, also on the commit before the api change): two POSTs in the same millisecond tie on `createdAt`, and the stable sort keeps insertion order. Not caused by this change and outside the tasks; left as is.
- Task 3: `renderList` wraps the title link and, only when tags exist, a `span.tags` (`textContent` = `tags.join(", ")`) in one `span`, so the flex `li` keeps tags next to the title and Remove on the right; `.tags` margin/colour added in `packages/web/index.html`. Display only, per the approved answer on the add form.
- Task 4: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=890` (baseline was 835, delta 55); wrote 890 into `measure/baseline.json`; re-run printed delta 0.
- Task 5 (API half run, page half deferred by the user; checked off): User decision at the blocked Implementation result (branch tip 6bffd1f): "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." Earlier detail follows: the planned `pnpm --filter @sample/api start` fails before listening (`ERR_MODULE_NOT_FOUND` for `./app.js` imported from `src/server.ts`, because `node --experimental-strip-types` does not map `.js` specifiers to `.ts`; `server.ts` is unchanged by this work item). The API half ran instead through a temporary resolver hook outside the repo (`node --experimental-strip-types --import /tmp/fijih44-loader/register.mjs src/server.ts`), with the web dev server (`pnpm --filter @sample/web dev`) proxying to it. The page half could not run: the browser tool (Chrome DevTools MCP `new_page`) was not permitted in this session, so "news, tech" after the first title and nothing extra after the second was not seen on the live page.
- Task 6: root `pnpm test`, `pnpm lint`, `pnpm typecheck` passed (api test hit the pre-existing same-millisecond flake in 1 of 3 root runs; the other runs passed).

## Validation Evidence

- AC-1: passed - api test "defaults to an empty list"; live `curl` POST without tags answered 201 with `"tags":[]`. Page part of task 5 deferred: "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." (blocked Implementation result question on the task 5 page check, branch tip 6bffd1f).
- AC-2: passed - shared and api tests; live `curl` POST `tags:[" News","news","Tech "]` answered 201 with `"tags":["news","tech"]`.
- AC-3: passed - shared (32 accepted, 33 rejected, inner space/tab rejected) and api tests (400 `{"error":"invalid tag"}`, list unchanged); live `curl` with `["two words"]` answered 400 `{"error":"invalid tag"}`.
- AC-4: passed - shared and api tests for not-an-array, non-string element, empty, and whitespace-only.
- AC-5: passed - api test and live `GET /bookmarks` (also through the vite proxy) returned `tags` `["news","tech"]` and `[]`.
- AC-6: deferred — "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." (blocked Implementation result question on the task 5 page check, branch tip 6bffd1f). Web unit tests pass (tags after the title joined with ", ", no tags element when empty); the live-page part of task 5 was not run.
- AC-7: passed - root `pnpm test` (shared 10, api 12, web 5), `pnpm lint`, `pnpm typecheck`; api test has a pre-existing flake (see Implementation Record).
- AC-8: passed - `pnpm build && pnpm measure` printed `web_bundle_gzip_bytes=890`, `web_bundle_gzip_delta=0` with the baseline at 890.

## Quality Gate

Gate: concerns

Full review of the branch diff `main...520031f` (commits 896337d, 44692cb, 48d6bd7, 57cf34c and the work-item commits). Re-run on the reviewed head: root `pnpm test` (shared 10, api 12, web 5 passed), `pnpm lint` and `pnpm typecheck` passed; `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=890`, `web_bundle_gzip_delta=0`.

### Acceptance trace

- AC-1: implementation `packages/shared/src/index.ts` `normalizeTags` (`undefined` → `[]`), `packages/api/src/app.ts` passes `body.tags`, `packages/api/src/store.ts` stores `tags`; verification api test "defaults to an empty list", shared test "defaults to an empty list", live `curl` POST answered 201 with `"tags":[]`.
- AC-2: implementation `normalizeTags` (trim, lower-case, `Set` keeps first occurrence); verification shared test "trims, lower-cases, and deduplicates…" (including order `["b","a","B"]` → `["b","a"]`), api test "trims, lower-cases, deduplicates, and returns tags on POST and GET", live `curl` → `["news","tech"]`.
- AC-3: implementation `normalizeTags` length and `/\s/` checks, `store.add` throws `ValidationError("invalid tag")` before `items.set`; verification shared tests (32 accepted, padded 32 accepted, 33 rejected, space and tab rejected), api `it.each` cases "too long" and "inner whitespace" (400 `{"error":"invalid tag"}`, list unchanged), api test "accepts a 32-character tag", live `curl` `["two words"]` → 400. See minor finding F1 on non-ASCII length.
- AC-4: implementation `normalizeTags` (non-array, non-string, empty after trim → `null`); verification shared test "rejects a non-array value and non-string elements" and "rejects empty and whitespace-only tags", api `it.each` cases "empty", "whitespace only", "not an array", "non-string element" (400, list unchanged).
- AC-5: implementation `store.ts` stores the normalised list, `list()` returns it; verification api test (GET finds `["news","tech"]`), live `GET /bookmarks` returned `["news","tech"]` and `[]`.
- AC-6: implementation `packages/web/src/render.ts` (`span.tags` with `textContent = tags.join(", ")` after the link, omitted when empty), `.tags` style in `packages/web/index.html`; verification web tests "shows tags after the title, comma separated", "renders no tags element and no extra text when there are no tags", "renders tag text as text, not markup". Live-page check deferred: "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." (blocked Implementation result question on the task 5 page check, branch tip 6bffd1f).
- AC-7: tests in all three packages cover AC-1 to AC-6; root `pnpm test`, `pnpm lint`, `pnpm typecheck` passed (Implementation result and re-run at 520031f).
- AC-8: `measure/baseline.json` `web_bundle_gzip_bytes: 890`; `pnpm build && pnpm measure` at 520031f printed 890, delta 0.

Product decisions D1 to D7 and the display-only answer on the add form agree with the acceptance criteria; no contradiction found.

### Findings

- F1 (minor) `packages/shared/src/index.ts:54`: the 32 limit counts UTF-16 code units of the lower-cased tag, not characters of the trimmed tag. Reproduced: `normalizeTags(["😀".repeat(17)])` (17 characters) and `normalizeTags(["İ".repeat(32)])` (32 characters, 64 code units after `toLowerCase`) both return `null`, so a non-ASCII tag of 32 or fewer characters answers 400 `{"error":"invalid tag"}`, against AC-3's "a tag of exactly 32 characters is accepted". ASCII tags behave as specified. Follow-up: measure `[...trimmed].length` before lower-casing, or record the code-unit rule as a product decision.

### Residual risks

- AC-6 deferred by the user: "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." The live page (tags next to the title in the flex `li`, Remove on the right) was not seen; confirm by loading the page with one tagged and one untagged bookmark.
- Pre-existing flake in api test "creates, lists newest first, and deletes" (two POSTs in the same millisecond tie on `createdAt`; also on `main`): it can fail the required `test` check intermittently; confirm by re-running CI, and fix outside this work item.
- Pre-existing `pnpm --filter @sample/api start` fails with `ERR_MODULE_NOT_FOUND` (`src/server.ts` imports `./app.js` under `--experimental-strip-types`); unchanged by this work item, outside its tasks.

Reviewed head: 520031f9e61cdec307da7054871c52c7392db4a4

## Review Record

## Change Log

- 2026-10-28: Plan drafted from FIJIH-44 at revision 2026-10-28T22:54:03.939+0100; issue assigned to Mattia Panzeri.
- 2026-10-28: Approved: plan-approval — Approve, with the proposed answers.
- 2026-10-28: Task 1 implemented (shared tag normalisation).
- 2026-10-28: Task 2 implemented (api tags).
- 2026-10-28: Task 3 implemented (web tags display).
- 2026-10-28: Task 4 done (bundle baseline 835 to 890).
- 2026-10-28: Tasks 5 (partial) and 6 recorded; blocked on the live-page check.
- 2026-10-28: Task 5 page check deferred by the user at the blocked Implementation result (branch tip 6bffd1f): "Option 2: defer the page check of task 5; the web unit tests are enough for AC-6 in this run." Task 5 checked off; API half verified by curl; checkpoint set to implementation-approval.
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Quality gate recorded: concerns (one minor finding, residual risks) at 520031f.
