---
schema: fiji/work-item/v1
id: FIJIH-43
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-43
  revision: "2026-10-28T21:48:02.496+0100"
lifecycle:
  status: active
  phase: automated-review
  checkpoint: ready-for-review
  transition: ready-for-review
  attempt: 3
quality:
  gate: concerns
artifacts:
  branch: FIJIH-43-add-bookmark-tags
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/6
  jira_context_comment_id: null
---

# Work Item FIJIH-43: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks and see each one's group next to its title.

## Product Context

Source: Jira story FIJIH-43 "Add tags to bookmarks" (type Story, priority Medium, label `scenario-S17`), revision `2026-10-28T21:48:02.496+0100`. The issue has no comments, attachments, links, or Figma URLs.

Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."

Issue acceptance criteria, quoted:

- POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
- GET /bookmarks returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.

Decisions in the issue: tags are not filterable yet.

Out of scope in the issue: filtering or searching by tag; editing tags of an existing bookmark.

Open product questions (also under the Plan result's `risks`; answer at `plan-approval`):

1. Web add form: the issue says the page *shows* tags but not whether the add form lets a user *enter* them. Is a tags input on the add form in scope? This plan assumes **no** (tags are set through the API only) until answered.
2. Malformed `tags`: what does POST answer when `tags` is present but not an array, or holds a non-string element? This plan proposes 400 `{"error":"invalid tag"}`.
3. Empty tags: is a tag that is empty after trimming (`""`, `"   "`) rejected with 400 `{"error":"invalid tag"}`, or silently dropped? This plan proposes rejecting it.
4. Validation order: this plan reads the issue as validating each tag *after* trimming, so `"  news  "` is accepted as `news` and only inner whitespace (`"my tag"`) is rejected; the 32-character limit counts the trimmed tag's characters (`string.length`). Confirm.
5. Separator: "comma separated" is rendered as `, ` (comma and space), e.g. `news, tech`. Confirm.
6. README: `README.md` describes `packages/shared` as "URL validation and normalisation, sorting". Adding tag normalisation there leaves that row incomplete. Is updating that README row in scope?

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings; each tag is trimmed and lower-cased, duplicates (after trimming and lower-casing) are removed keeping the first occurrence's position, and the created bookmark in the 201 response carries the resulting `tags` array. A request without `tags` creates a bookmark with `tags: []`.
2. `POST /bookmarks` answers 400 with body exactly `{"error":"invalid tag"}`, and stores nothing, when any tag (after trimming) is longer than 32 characters or contains whitespace; a tag of exactly 32 characters is accepted. (Product questions 2 to 4 may extend this criterion.)
3. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags the bookmark was created with after normalisation (`[]` when it has none).
4. The web page shows each bookmark's tags after its title, joined by `, ` (product question 5), and renders no tag text and no tag element for a bookmark with no tags; the link and Remove button keep working as before.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in criteria 1 to 4, including the 32/33-character boundary, inner whitespace, case and whitespace deduplication, the default empty array, and the no-tags rendering.
6. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build && pnpm measure` prints on this branch (delta 0), per `AGENTS.md`.
7. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. The web page shows the total number of tags across all listed bookmarks in its title, in the form `Bookmarks (N)`, where N is the sum of the tag counts of all bookmarks. With no bookmarks or no tags it shows `Bookmarks (0)`. The count updates when the list is rendered, including after a bookmark is added or removed.
9. Each bookmark's tags span ends with its tag count in parentheses, for example `news, tech (2)`; a bookmark without tags renders unchanged.

## Tasks and Subtasks

- [x] Shared tag model and normalisation in `packages/shared/src/index.ts` (AC: 1, 2, 3)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a `MAX_TAG_LENGTH = 32` constant, a pure `isValidTag(tag: string): boolean` (non-empty per question 3, at most 32 characters, no whitespace `/\s/`, checked on the trimmed value), and a pure `normalizeTags(tags: readonly string[]): string[]` (trim, lower-case, deduplicate keeping first occurrence).
- [x] Shared unit tests in `packages/shared/src/index.test.ts` (AC: 5)
  - [x] `normalizeTags`: trims, lower-cases, deduplicates `["News", " news ", "NEWS"]` to `["news"]`, keeps first-occurrence order, returns `[]` for `[]`, and does not mutate its input.
  - [x] `isValidTag`: accepts a 32-character tag and a tag with surrounding whitespace; rejects a 33-character tag, `"my tag"`, a tab or newline inside, and (per question 3) an empty or blank tag.
- [x] API store and route in `packages/api/src/store.ts` and `packages/api/src/app.ts` (AC: 1, 2, 3)
  - [x] In `BookmarkStore.add`, validate `input.tags ?? []` (array of strings, per question 2), throw `ValidationError("invalid tag")` on the first invalid tag before storing, and store `normalizeTags(...)` on the bookmark.
  - [x] In `createApp`, pass `body.tags` through from the POST body to `store.add` without changing the existing `url`/`title` handling.
- [x] API tests in `packages/api/src/app.test.ts` (AC: 5)
  - [x] POST with `tags: [" News ", "news", "Tech"]` answers 201 with `tags: ["news", "tech"]`; POST without `tags` answers 201 with `tags: []`.
  - [x] POST with a 33-character tag and with `"my tag"` each answers 400 `{"error":"invalid tag"}`, and the following GET does not contain those bookmarks; a 32-character tag is accepted.
  - [x] (per question 2) POST with `tags: "news"` and with `tags: [1]` answers 400 `{"error":"invalid tag"}`.
  - [x] GET `/bookmarks` returns each bookmark's normalised `tags`.
- [x] Web rendering in `packages/web/src/render.ts` (AC: 4)
  - [x] After the title link, append a `<span class="tags">` whose text is `bookmark.tags.join(", ")` only when `bookmark.tags.length > 0`; append nothing otherwise. Keep the Remove button last.
  - [x] Adjust `packages/web/index.html` styles only as needed so the tags sit next to the title and the Remove button stays at the end of the row (the `li` is `display: flex; justify-content: space-between`).
- [x] Web tests in `packages/web/src/render.test.ts` (AC: 5)
  - [x] Update existing fixtures to include `tags: []`.
  - [x] A bookmark with `tags: ["news", "tech"]` renders `news, tech` after the link and before the Remove button; a bookmark with `tags: []` renders no `.tags` element and the item's text is only the title and `Remove`.
- [x] Bundle baseline (AC: 6)
  - [x] Run `pnpm build` then `pnpm measure`; set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value (current baseline 835) and re-run `pnpm measure` to confirm delta 0.
- [x] Repository checks (AC: 7)
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results in Validation Evidence.

- [x] Shared tag-count helper (AC: 8; Scope change entry, Re-entry 2)
  - [x] Add a pure `countTags(bookmarks: readonly { tags: readonly string[] }[]): number` in `packages/shared/src/index.ts` summing tag counts, duplicates counted (`["news"]` on two bookmarks is 2), with a unit test in `packages/shared/src/index.test.ts` (0 for none, 0 with no tags, duplicates counted).
- [x] Web total-tags heading and tab title (AC: 8; Scope change entry, Re-entry 2)
  - [x] Whenever `renderList` renders (including the empty list), set the `<h1>` text and `document.title` to `Bookmarks (N)`; web tests in `packages/web/src/render.test.ts` cover 0 (no bookmarks and no tags), duplicates counted, and update after a re-render following add and remove.
- [x] Bundle baseline for AC 8 (AC: 6, 8; Scope change entry, Re-entry 2)
  - [x] Run `pnpm build` then `pnpm measure`; set `measure/baseline.json` to the printed value and confirm delta 0.

- [x] Web tag count suffix in `packages/web/src/render.ts` (AC: 9; Scope change entry, Re-entry 3)
  - [x] Set the `span.tags` text to `<tags joined by ", "> (<count>)`; a bookmark with no tags still renders no tags span and its item text is unchanged.
- [x] Web tests in `packages/web/src/render.test.ts` (AC: 9, 5; Scope change entry, Re-entry 3)
  - [x] Update the existing exact-text assertion `news, tech` to `news, tech (2)`; add a single-tag case (`news (1)`) and keep the no-tags case (no span, text unchanged).
- [x] Bundle baseline for AC 9 (AC: 6, 9; Scope change entry, Re-entry 3)
  - [x] Run `pnpm build` then `pnpm measure`; set `measure/baseline.json` to the printed value and confirm delta 0.

## Engineering Context

- Workspace (from `AGENTS.md`): `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web`. Tag normalisation and validation therefore live in `shared` as pure functions; the API store owns the 400 decision through its existing `ValidationError`, which `createApp` already maps to `400 {"error": <message>}`.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">` (becomes `Pick<...> & { tags?: readonly string[] }` or equivalent so `tags` stays optional on input while `Bookmark.tags` is required on output), `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title then URL then duplicate URL; tag validation slots in after those checks so existing error precedence is unchanged.
  - `packages/api/src/app.ts`: the POST handler casts the body to `{ url?: string; title?: string }`; widen it to include `tags?: unknown` and let the store validate the shape.
  - `packages/web/src/render.ts`: `renderList` builds `li > a + button`; `packages/web/src/main.ts` needs no change unless product question 1 brings a tags input into scope.
- Implementation choices within the criteria: lower-casing uses `String.prototype.toLowerCase()` (locale-independent); deduplication keeps the first occurrence's position; tag length counts UTF-16 code units (`string.length`); tags are rendered with `textContent`, never `innerHTML`.
- Adjacent items:
  - Filtering or searching by tag, and editing tags of an existing bookmark: out of scope (Jira FIJIH-43, "Out of scope" and "Decisions").
  - `DELETE /bookmarks/:id` and `GET /health`: unaffected.
  - Web add form tags input (product question 1) and the README `packages/shared` row (product question 6): asked under `risks`; not planned until answered.
- Bundle: adding a tags element to `render.ts` grows the gzipped web bundle; `AGENTS.md` requires `measure/baseline.json` to move in the same pull request (AC 6).
- Change intent: `AGENTS.md` requires a changeset in `.changeset/` whose summary is the pull request title without the Jira key ("Add tags to bookmarks"); Delivery (`fiji-deliver-change`) adds it, so it is not an Implementation task here.

## Testing Strategy

- Unit (Vitest, per package, as `AGENTS.md` requires for every behaviour change):
  - `packages/shared`: happy (normalisation, defaults) and unhappy (length, whitespace, blank) cases for `normalizeTags` and `isValidTag`, plus the 32/33 boundary.
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port, as the existing suite does: create with and without tags, invalid tag 400 with nothing stored, malformed `tags` 400 (per question 2), GET returns tags.
  - `packages/web`: jsdom `renderList` tests for tags shown after the title and for no tag output when empty; existing empty-state and Remove tests keep passing.
- Integration: the API tests exercise route, store, and shared functions together; no separate integration suite exists.
- Migration: none; the store is in-memory, so no persisted bookmarks lack `tags`.
- Design: no Figma reference; layout limited to keeping tags next to the title and Remove at the end of the row.
- Release: bundle baseline update (AC 6) and the root `pnpm test`, `pnpm lint`, `pnpm typecheck` run (AC 7). No manual, live-app, or end-to-end check is planned; no criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) must pass before merge to `main` — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`, and `.github/workflows/ci.yml` job `test` runs on `pull_request`; owner: repository admin (`panz3r`).
- One approving review and squash-only merge to `main` — where: same ruleset 26033321, `pull_request` rule; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). `TEAMS.md` names `duckyduff369` (QA Engineer) as the required approver.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected".
- This change adds, removes, or renames no CI check contexts, and needs no environments, secrets, deploy configuration, or other repositories.

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
- .changeset/bookmark-tags.md
- _plans/fiji-work-items/FIJIH-43.md

## Implementation Record

- Shared tag model/tests: added `tags` to `Bookmark`, optional `tags` on `NewBookmark`, `MAX_TAG_LENGTH`, `isValidTag` (trimmed, non-empty, <=32, no whitespace), `normalizeTags` (Set keeps first-occurrence order). Focused: `pnpm --filter @sample/shared test` 8 passed.
- API store/route: `BookmarkStore.add` validates `input.tags ?? []` after title/url/duplicate checks (non-array, non-string, blank, >32, inner whitespace all throw `ValidationError("invalid tag")`), stores normalised tags; POST passes `body.tags` through. Focused: `pnpm --filter @sample/api test` 11 passed.
- Web: `renderList` appends `span.tags` (textContent, joined by `, `) between link and Remove only when tags exist; index.html styles keep tags next to the title and Remove at the row end. No tags input on the add form (question 1 default). Focused: `pnpm --filter @sample/web test` 4 passed.
- Bundle baseline: `pnpm build` then `pnpm measure` printed 881 (baseline was 835, delta 46); set `web_bundle_gzip_bytes` to 881 and re-ran `pnpm measure`: delta 0.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` run from the root, all passed (the first two ran before the baseline edit, which touches no code input).
- Approved product defaults (plan-approval): no web tags input; non-array/non-string tags and blank tags answer 400 invalid tag; validation on trimmed tag; `, ` separator; README row unchanged.
- Review fix `680eb98`: `store.add` uses `input.tags === undefined ? [] : input.tags`, so explicit `null` answers 400 `invalid tag`; added the `null` case to the `it.each` rejection cases in `packages/api/src/app.test.ts`. `pnpm test` (shared 8, api 12, web 4), `pnpm lint`, `pnpm typecheck` pass; web bundle unaffected (api-only change).
- Re-entry 2 (AC 8): added pure `countTags` in shared (sum of `tags.length`, duplicates counted) with unit tests; `renderList` now sets `document.title` and the `<h1>` text to `Bookmarks (N)` on every render, including the empty list. Web tests cover 0 (none, and no tags), duplicates across bookmarks, and re-render after add and remove. `pnpm build` then `pnpm measure` printed 940 (baseline 881, delta 59); set baseline to 940, re-run: delta 0. `pnpm test` (shared 10, api 12, web 7), `pnpm lint`, `pnpm typecheck` pass. No other product change.

- Re-entry 3 (AC 9): `renderList` sets the `span.tags` text to `<tags joined by ", "> (<count>)`; a bookmark without tags still renders no span and its item text is unchanged. Necessary consequence: the existing web test asserting the exact span text `news, tech` now asserts `news, tech (2)`; added a single-tag case (`news (1)`); the no-tags case is unchanged. No shared helper (the count is `bookmark.tags.length`). `pnpm build` then `pnpm measure` printed 950 (baseline 940, delta 10); set baseline to 950, re-run: delta 0. `pnpm test` (shared 10, api 12, web 8), `pnpm lint`, `pnpm typecheck` pass. No other product change.

## Validation Evidence

- AC-1: passed — shared normalizeTags tests and API tests (201 with `["news","tech"]`, default `[]`).
- AC-2: passed — API tests: 33-char, inner whitespace, blank, non-array, non-string each 400 `{"error":"invalid tag"}` with nothing stored; 32-char accepted.
- AC-3: passed — API test: GET returns normalised tags, `[]` when none.
- AC-4: passed — web render tests (since re-entry 3 the span text is `news, tech (2)`, see AC-9): tags between link and Remove; no `.tags` element when empty.
- AC-5: passed — Vitest tests added in packages/shared, packages/api, packages/web.
- AC-6: passed — baseline 950; `pnpm build` then `pnpm measure` prints delta 0.
- AC-7: passed — `pnpm test`, `pnpm lint`, `pnpm typecheck` pass from the root.
- AC-8: passed — shared `countTags` tests and web `render.test.ts` cases: `Bookmarks (0)` for no bookmarks and for no tags, `Bookmarks (2)` for `["news"]` on two bookmarks, and h1 and `document.title` update across add and remove re-renders.
- AC-9: passed — web `render.test.ts`: `news, tech (2)` for two tags, `news (1)` for one tag, and no `.tags` element with item text `ExampleRemove` for no tags.

## Quality Gate

Gate: **concerns**. All nine criteria are evidenced. One minor finding and one residual risk remain.

Reviewed head: `8707c901b0c7a06f9213d70d57c844029c4e3cb3`. This is a full re-review of the branch diff against `main` (commits 993848b..8707c90). Re-entry 3 commits since the previous reviewed head `d325e92` change product files, so the review covers all nine criteria at this tip.

At the reviewed head, QA re-ran the repository checks. `pnpm test` exited 0 (shared 10, api 12, web 8 tests). `pnpm lint` exited 0. `pnpm typecheck` exited 0. `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=950` and `web_bundle_gzip_delta=0`.

Scope of Re-entry 3: since `d325e92`, the only product changes are in `8707c90`:
- One line in `packages/web/src/render.ts`: the `span.tags` text is now `` `${bookmark.tags.join(", ")} (${bookmark.tags.length})` ``.
- `packages/web/src/render.test.ts`: the AC-4 exact-text expectation changes from `news, tech` to `news, tech (2)` (a required consequence), and one new single-tag test (`news (1)`).
- `measure/baseline.json` moves from 940 to 950.

The commits `5c1a772`, `9fcb896`, `4a5710c`, `8c36c8a`, `f9b56a4`, `fd2b1da`, and `eb5c6b0` change only this work item. In the work item, criteria 1 to 8 are worded as before; criterion 9 is the only new criterion. Nothing beyond criterion 9 changed.

Criterion consistency: criterion 9 does not conflict with criterion 4 or criterion 8.
- Criterion 4: the tags are still joined by `, ` and come after the title. With no tags there is still no span and no tag text, and no `(0)` is shown. This matches criterion 9's "renders unchanged".
- Criterion 8: the `<h1>` and `document.title` show the total over all bookmarks (`countTags`). The span shows the count for one bookmark (`bookmark.tags.length`). Both count the same stored (normalised) tags, so the span counts add up to the heading count.

### Acceptance trace

| AC | Implementation | Verification |
|---|---|---|
| 1 | `packages/shared/src/index.ts` `normalizeTags`: trims, applies `toLowerCase`, and uses a `Set` that keeps the first occurrence. `packages/api/src/store.ts` `add` stores `normalizeTags(rawTags)` and defaults to `[]` only when `tags` is `undefined`. `packages/api/src/app.ts` passes `body.tags` through. | `packages/shared/src/index.test.ts` `normalizeTags` cases: dedup, order, `[]`, no mutation. `packages/api/src/app.test.ts` "normalizes tags on create and returns them from GET" (201 with `["news","tech"]`) and "defaults to an empty tags array". QA also checked against the running API: `["News","tech"]` was stored as `["news","tech"]`, and a POST without `tags` was stored with `[]`. |
| 2 | `isValidTag` checks the trimmed tag: non-empty, at most 32 characters, no `/\s/`. Before `items.set`, `store.add` throws `ValidationError("invalid tag")` for a non-array (including `null`), a non-string element, or an invalid tag. | `index.test.ts` `isValidTag` cases: 32 and 33 characters, space, tab, newline, empty, blank. `app.test.ts` "accepts a 32-character tag". Its `it.each` covers a 33-character tag, inner whitespace, a blank tag, a non-array, a non-string, and `null`. Each answers 400 `{"error":"invalid tag"}`, and the URL is absent from the GET that follows. |
| 3 | `Bookmark.tags: string[]` is required. `store.list()` returns the stored bookmarks. | `app.test.ts`: GET returns `["news","tech"]` and `[]`. QA's GET through the Vite proxy returned `tags` on every bookmark. |
| 4 | `packages/web/src/render.ts` appends `span.tags` (`textContent`) between the link and Remove, only when `tags.length > 0`. The text starts with `tags.join(", ")`. `packages/web/index.html` adds the `li a` and `li .tags` styles. | `packages/web/src/render.test.ts`: the text is `news, tech (2)` (count suffix per AC-9) and the child order is `A, SPAN, BUTTON`. With no tags there is no `.tags` element and the text is `ExampleRemove`. The Remove test still passes. |
| 5 | Vitest tests are in all three packages. | See the rows above. QA re-ran `pnpm test`: 30 tests passed. |
| 6 | `measure/baseline.json` `web_bundle_gzip_bytes` is 950. | QA re-ran `pnpm build && pnpm measure`: 950, delta 0. |
| 7 | — | QA re-ran `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root. All exited 0. |
| 8 | `countTags` sums `tags.length` and counts duplicates. On every call, `renderList` sets `document.title` and the first `<h1>` to `Bookmarks (N)`, before the empty-list return. `packages/web/src/main.ts` (unchanged) calls `renderList` through `refresh()` on load, after an add, and after a remove. | `index.test.ts` `countTags`: 0 for none, 0 with no tags, duplicates counted. `render.test.ts` "total tags heading": `Bookmarks (0)` for no bookmarks and for bookmarks without tags, `Bookmarks (2)` for `["news"]` on two bookmarks, and the count updates on re-render (1, then 3 after an add, then 2 after a remove). |
| 9 | `packages/web/src/render.ts` sets the `span.tags` text to `` `${bookmark.tags.join(", ")} (${bookmark.tags.length})` ``, still with `textContent`. The no-tags branch is untouched. | `render.test.ts`: `news, tech (2)` for two tags, `news (1)` for one tag (new test), and for no tags there is no `.tags` element and the item text is `ExampleRemove`. |

Notes:
- On AC-8: until the first `refresh()` completes, the static `index.html` heading `Bookmarks` shows without a count. It also stays that way if the initial `GET /bookmarks` fails. The criterion ties the count to rendering, so this is not a finding.
- On AC-9: a tag may itself contain parentheses, because only whitespace is disallowed. For example `a(1)` renders as `a(1) (1)`. This is cosmetic and within the criterion, so it is not a finding. The text goes through `textContent`, so there is no injection path.

### Findings

1. **minor**: `packages/shared/src/index.ts` `isValidTag` and `normalizeTags`. The length check runs on the trimmed tag before lower-casing, and `toLowerCase()` can make a string longer. The code is unchanged since the earlier reviews. QA reproduced it again at `8707c90` against the shared functions: the tag `"İ" + "a".repeat(31)` is 32 UTF-16 code units, `isValidTag` accepts it, and `normalizeTags` returns a tag of length 33. That is longer than `MAX_TAG_LENGTH` (32). AC-2's literal wording ("after trimming") is met. The user accepted this as a follow-up at `local-qa-review`.

### Residual risks

- Suspected: the `index.html` flex styles (`li a { margin-right }`, `li .tags { flex: 1 }`) have still not been checked in a browser. AC-9 makes the tags span text longer, so this layout matters a little more. jsdom tests cover DOM order only, not layout, and the Testing Strategy plans no live-app check.
  - What QA tried: it started the API (with a `.js`-to-`.ts` resolve hook outside the worktree, because of the start-script failure noted below) and the Vite dev server. It seeded a bookmark with two tags, one with one tag, and one with none, and confirmed the data through the Vite proxy.
  - Why it stays unconfirmed: the browser tool (Chrome DevTools MCP) was not permitted in this session, so the visual check was not run.
  - To confirm, load the page with those three bookmarks and check four things: the tags and their `(N)` count sit next to the title, Remove stays at the end of the row, the untagged row shows only the title and Remove, and the h1 and tab title read `Bookmarks (3)`.
- No Operational Requirements entry has `evidence: unverified`. No Validation Evidence line is `deferred` or `pending-ci`.
- Observation outside this change: `pnpm --filter @sample/api start` (`node --experimental-strip-types src/server.ts`) still fails to resolve `./app.js`, because Node's type stripping does not map `.js` imports to `.ts` files. This branch changes neither `server.ts` nor the start script, so the failure was not introduced here and it is not a finding.

## Review Record

- Copilot review of `df41df9` (1 finding). Thread `PRRT_kwDOVaYq_M6xUY8X` (`packages/api/src/store.ts:20`, `tags: null` defaulted to `[]` with 201): disposition `valid`; fixed in `680eb98` (default only when `tags` is `undefined`, `null` test case added); replied citing the pushed fix, thread resolved, Copilot re-review requested. Copilot's re-review of `680eb98` raised no open issues ("Approval recommended").
- CI run 40768132659 (workflow `ci`) on `680eb98`: success.
- Copilot review of `9fcb896` (attempt 2, requested 2026-10-28T21:10:19Z; submitted 21:12:16Z): "Approval recommended", no open issues, no new threads. The earlier thread `PRRT_kwDOVaYq_M6xUY8X` stays resolved. No fixes, replies, or re-review requests were needed.
- CI run 40769688221 (workflow `ci`) on `9fcb896`: success.
- Copilot review of `360f2ba` (attempt 3, requested 2026-10-28T21:22:21Z; submitted 21:24:00Z): "Approval recommended", no open issues, no new threads. The earlier thread `PRRT_kwDOVaYq_M6xUY8X` stays resolved. No fixes, replies, or re-review requests were needed.
- CI run 40771376304 (workflow `ci`) on `360f2ba`: success (test, lint, typecheck).
- Stale — superseded by re-entry 3. Jira handoff draft (comment, marker `FIJI-CONTEXT:FIJIH-43:fiji/orchestrate-development/v1`), drafted at remote-review from the Quality Gate (concerns at `d325e92`), Validation Evidence, Review Record, Change Log, and PR #6 (head `9fcb896`, CI run 40769688221 success; `duckyduff369` APPROVED on `9fcb896`; the one Copilot thread resolved):

  > FIJI-CONTEXT:FIJIH-43:fiji/orchestrate-development/v1
  >
  > **Outcome.** Bookmarks now take an optional `tags` array. PR: https://github.com/panz3r/fijih-sample/pull/6 (head `9fcb896`; CI `test` passed; approved by the QA Engineer `duckyduff369`).
  > - `POST /bookmarks` trims, lower-cases and deduplicates tags (first occurrence kept); no `tags` gives `[]`. A tag that is blank, longer than 32 characters, or contains whitespace, or a `tags` value that is not an array of strings, answers 400 `{"error":"invalid tag"}` and stores nothing. `GET /bookmarks` returns each bookmark's `tags`.
  > - The web page shows each bookmark's tags after its title, joined by `, `, and nothing when there are none.
  > - Scope change approved by the user during review: the web page `<h1>` and `document.title` read `Bookmarks (N)`, where N is the total number of tags across the listed bookmarks, duplicates counted (`["news"]` on two bookmarks is 2).
  > - Validation: `pnpm test` (shared 10, api 12, web 7), `pnpm lint`, and `pnpm typecheck` pass from the root. `web_bundle_gzip_bytes` in `measure/baseline.json` went 835 to 881 (tags) to 940 (total count), delta 0 at each step.
  >
  > **Decisions.** Tag validation and normalisation are pure functions in `packages/shared` (`isValidTag`, `normalizeTags`, `countTags`); the API store raises the 400. Validation runs on the trimmed tag. No tags input on the web add form (tags are set through the API only). The `README.md` `packages/shared` row is unchanged. Tags are not filterable or editable (out of scope in the issue).
  >
  > **Review.** Copilot raised one finding: an explicit `tags: null` was treated as no tags and answered 201. Fixed in `680eb98` (default to `[]` only when `tags` is `undefined`), test added, thread resolved; Copilot's later reviews raised nothing.
  >
  > **Residual risks and follow-ups.**
  > - Lower-casing runs after the 32-character length check, and `toLowerCase()` can lengthen a string, so a tag can be stored longer than 32. Example: `"İ"` followed by 31 `a` characters (32 UTF-16 code units) is accepted and stored with length 33. The user accepted this as a follow-up.
  > - The web layout (`packages/web/index.html` flex styles for tags and the Remove button) was not checked in a browser; jsdom tests cover DOM order only. Load the page with one tagged and one untagged bookmark to confirm the tags sit next to the title, Remove stays at the row end, and the heading and tab title read `Bookmarks (N)`.
  > - Unrelated to this change: `pnpm --filter @sample/api start` fails with `ERR_MODULE_NOT_FOUND` for `./app.js`; this branch changes neither `server.ts` nor the start script.
  >
  > No operational or documentation work remains.

## Change Log

- 2026-10-28: Drafted from Jira FIJIH-43 revision `2026-10-28T21:48:02.496+0100` (issue assigned to Mattia Panzeri during Plan).
- 2026-10-28: Approved: plan-approval — Approve, with the defaults for all six questions.
- 2026-10-28: Implemented shared tag model and tests.
- 2026-10-28: Implemented API tags handling and tests.
- 2026-10-28: Implemented web tag rendering and tests.
- 2026-10-28: Updated bundle baseline to 881 and ran repository checks.
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Local QA review recorded gate `concerns` at `9943bb3` (two minor findings, one residual risk).
- 2026-10-28: Finalize: all tasks checked and all acceptance criteria evidenced; no bookkeeping slips found. Eight checked tasks have no Implementation Record entry citing an in-range commit (reported as discrepancies, left checked). Set checkpoint `local-qa-review`.
- 2026-10-28: Approved: local-qa-review — Approve.
- 2026-10-28: Delivery: added changeset `.changeset/bookmark-tags.md`, pushed the branch, opened draft PR #6 (label `enhancement`) and requested a Copilot review.
- 2026-10-28: Copilot findings pass: 1 finding fixed (`680eb98`, `tags: null` now rejected), thread resolved, Copilot re-review clear. Set checkpoint `ready-for-review`.
- 2026-10-28: Re-entry 2: user-request — ready-for-review at 906b043; user's decision: "Yes, criterion 8 as proposed: both the h1 and the tab title, total tags with duplicates counted. Make exactly that change, then approve ready-for-review."
- 2026-10-28: Scope change: "Yes, criterion 8 as proposed: both the h1 and the tab title, total tags with duplicates counted. Make exactly that change, then approve ready-for-review." — ready-for-review at 906b043
- 2026-10-28: Approved: scope change — "Yes, criterion 8 as proposed: both the h1 and the tab title, total tags with duplicates counted. Make exactly that change, then approve ready-for-review."
- 2026-10-28: Implemented criterion 8 (total tags in h1 and tab title), updated bundle baseline to 940, repository checks pass. Set checkpoint `implementation-approval`, transition `implementation-complete`.
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Local QA review (full re-review, attempt 2) recorded gate `concerns` at `d325e92` (one minor finding, one residual risk; the `tags: null` finding is fixed).
- 2026-10-28: Finalize (attempt 2): all eight criteria evidenced and all tasks checked; bookkeeping slip fixed: File List lacked `.changeset/bookmark-tags.md` (committed at `df41df9`), now added. Eleven checked tasks (the eight from attempt 1 plus the three Re-entry 2 tasks) have no Implementation Record entry citing an in-range commit; reported as discrepancies, left checked. Set checkpoint `local-qa-review`, transition `qa-reviewed`.
- 2026-10-28: Approved: local-qa-review — Approve.
- 2026-10-28: Delivery (re-entry): pushed `9fcb896` (fast-forward from `680eb98`); updated draft PR #6 body to the final branch state (criterion 8, baseline 940, residual risks); requested a fresh Copilot review on the new head. PR stays draft. Set phase `automated-review`, transition `delivery-complete`.
- 2026-10-28: Copilot findings pass (attempt 2): Copilot review of `9fcb896` raised no findings; CI run 40769688221 passed. Set checkpoint `ready-for-review`, transition `ready-for-review`.
- 2026-10-28: Approved: ready-for-review — Approve.
- 2026-10-28: Ready-for-review: marked PR #6 ready for review and requested review from `duckyduff369` (QA Engineer, owning team per TEAMS.md; the author `panz3r` is excluded). Set phase `remote-review`, checkpoint `null`, transition `review-requested`. The work-item commits stay local (`may_push` alone does not push work-item-only commits).
- 2026-10-28: Jira handoff Draft: human review clear (`duckyduff369` APPROVED on `9fcb896`, no unresolved threads, Copilot clear); drafted the handoff comment in the Review Record (nothing posted to Jira). Set checkpoint `jira-handoff`, transition `handoff-drafted`. The commit stays local.
- 2026-10-28: Re-entry 3: user-request — jira-handoff at fd2b1da; user's decision: "Add acceptance criterion 9: each bookmark's tags span ends with its tag count in parentheses, for example `news, tech (2)`; a bookmark without tags renders unchanged. Make exactly that change, then approve."
- 2026-10-28: Scope change: "Add acceptance criterion 9: each bookmark's tags span ends with its tag count in parentheses, for example `news, tech (2)`; a bookmark without tags renders unchanged. Make exactly that change, then approve." — jira-handoff at fd2b1da
- 2026-10-28: Approved: scope change — "Add acceptance criterion 9: each bookmark's tags span ends with its tag count in parentheses, for example `news, tech (2)`; a bookmark without tags renders unchanged. Make exactly that change, then approve."
- 2026-10-28: Implemented criterion 9 (tag count suffix in the tags span), updated bundle baseline to 950, repository checks pass. Set checkpoint `implementation-approval`, transition `implementation-complete`.
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Local QA review (full re-review, attempt 3) recorded gate `concerns` at `8707c90`: all nine criteria evidenced, one minor finding (lower-casing after the length check), one residual risk (layout not checked in a browser; browser tool not permitted).
- 2026-10-28: Finalize (attempt 3): all nine criteria evidenced and all tasks checked; no bookkeeping slips found; File List matches the branch diff against `main`. Fourteen checked tasks (the eight from attempt 1, the three from Re-entry 2, and the three from Re-entry 3) have no Implementation Record entry citing an in-range commit; reported as discrepancies, left checked. Set checkpoint `local-qa-review`, transition `qa-reviewed`.
- 2026-10-28: Approved: local-qa-review — conditional: Add acceptance criterion 9: each bookmark's tags span ends with its tag count in parentheses, for example `news, tech (2)`; a bookmark without tags renders unchanged. Make exactly that change, then approve. (verified at 360f2ba)
- 2026-10-28: Delivery (re-entry 3, criterion 9): pushed `360f2ba` (fast-forward from `9fcb896`, carrying `8707c90` and the work-item commits); updated PR #6 body to the final branch state (criterion 9, baseline 950, `680eb98` null rejection, residual risks; approval and earlier Copilot review are on `9fcb896` only); requested a fresh Copilot review on the new head (`review_requested` for Copilot at 21:22:21Z). PR stays ready for review. Set phase `automated-review`, checkpoint null, transition `delivery-complete`. The commit stays local.
- 2026-10-28: Copilot findings pass (attempt 3): Copilot review of `360f2ba` raised no findings; CI run 40771376304 passed. Set checkpoint `ready-for-review`, transition `ready-for-review`. The commit stays local.
