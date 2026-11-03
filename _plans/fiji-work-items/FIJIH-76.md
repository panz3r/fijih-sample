---
schema: fiji/work-item/v1
id: FIJIH-76
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-76
  revision: 2026-11-03T12:22:07.636+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: qa-reviewed
  attempt: 2
quality:
  gate: concerns
artifacts:
  branch: FIJIH-76-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-76: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags that the API stores and the page shows,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-76 "Add tags to bookmarks" (Story, label `scenario-S1`, no comments, no links, no attachments, no Figma reference).
- Context from the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision from the issue: "Tags are not filterable yet."
- Out of scope from the issue: "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- Open product decisions (see Engineering Context > Open decisions): whether the web add form gets a tags input, how trimming interacts with the length/whitespace rules, empty tags, and malformed `tags` values.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence's position. When `tags` is omitted the bookmark gets `tags: []`. The `201` response body includes the normalised `tags`. Example: `["News", " news ", "Tech"]` is stored and returned as `["news", "tech"]`.
2. When any tag is longer than 32 characters or contains whitespace, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`), and renders no tag text or tag element for a bookmark with no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour of criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] 1. `packages/shared`: extend the model and add pure tag helpers (AC: 1, 2, 5)
  - [x] 1.1 Add `tags: string[]` to `Bookmark`; make `NewBookmark` `Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] }`.
  - [x] 1.2 Add `isValidTag(tag: string): boolean` (after trimming: at most 32 characters and no whitespace character, `/\s/`; empty-tag handling per Open decision D3).
  - [x] 1.3 Add `normalizeTags(tags: readonly string[]): string[]` (trim, lower-case, deduplicate keeping first occurrence order; does not mutate the input).
  - [x] 1.4 Tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case/whitespace variants, order kept, input not mutated; `isValidTag` accepts a 32-character tag and rejects a 33-character tag, an internal space, and an internal tab.
- [x] 2. `packages/api` store: validate, normalise, and store tags (AC: 1, 2, 3, 5)
  - [x] 2.1 In `BookmarkStore.add`, validate every tag with `isValidTag` and throw `ValidationError("invalid tag")` on the first failure, before anything is stored; store `normalizeTags(input.tags ?? [])`.
  - [x] 2.2 Tests in `packages/api/src/store.test.ts`: default `[]`, normalisation, rejection leaves the store unchanged, `list()` returns tags.
- [x] 3. `packages/api` HTTP: accept and return tags (AC: 1, 2, 3, 5)
  - [x] 3.1 In `createApp`, read `tags` from the POST body and pass it to `store.add`; a `tags` value that is neither omitted nor an array of strings is handled per Open decision D4.
  - [x] 3.2 Tests in `packages/api/src/app.test.ts`: POST with tags returns 201 and normalised tags; POST without tags returns `tags: []`; POST with a 33-character tag and with a tag containing a space each return 400 `{"error":"invalid tag"}` and the bookmark is absent from `GET /bookmarks`; `GET /bookmarks` returns each bookmark's tags.
- [x] 4. `packages/web`: show tags after the title (AC: 4, 5)
  - [x] 4.1 In `renderList`, when `bookmark.tags` is non-empty append an element (for example `<span class="tags">`) after the link whose `textContent` is `tags.join(", ")`; append nothing when it is empty. Use `textContent`, never `innerHTML`.
  - [x] 4.2 Update existing fixtures in `packages/web/src/render.test.ts` for the new required `tags` field, and add tests: a bookmark with `["news", "tech"]` shows `news, tech` after the title; a bookmark with `[]` renders no tag element and its item text is the title plus `Remove` only.
- [x] 5. Run the repository checks from the root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 5)
- [x] 6. Bundle size: run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is non-zero, set `measure/baseline.json` `web_bundle_gzip_bytes` to the new value in this change, per `AGENTS.md` (AC: 4)
- [x] 7. Validate the normalised tag in `BookmarkStore.add` and add a regression test (AC: 2, 5; Re-entry 2)
  - [x] 7.1 In `BookmarkStore.add`, normalise first (`normalizeTags`) and run `isValidTag` on each normalised tag, so lower-casing cannot push a stored tag past 32 characters; still throw `ValidationError("invalid tag")` before anything is stored.
  - [x] 7.2 Regression tests in `packages/api/src/store.test.ts` (and an `app.test.ts` 400 case): `"İ".repeat(32)` is rejected with `invalid tag` and stores nothing; an accepted tag's stored value always satisfies `isValidTag`.

## Engineering Context

- Workspace: pnpm; `packages/shared` is imported from source by `api` and `web` (`"exports": { ".": "./src/index.ts" }`).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, and pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag helpers belong here as pure functions.
  - `packages/api/src/store.ts` — `BookmarkStore.add` performs all validation and throws `ValidationError(message)`; `app.ts` maps `ValidationError` to `400 {"error": message}`, so `ValidationError("invalid tag")` yields the required body with no change to error mapping.
  - `packages/api/src/app.ts` — POST handler casts the body to `{ url?, title? }` and builds the `NewBookmark`; it must now pass `tags`.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with `<a>` (title) and a Remove `<button>`; tags go between them. `packages/web/src/main.ts` and `index.html` hold the add form (title, url only).
- Design choices within the criteria:
  - Validation runs on the trimmed tag (Open decision D2); "characters" counts Unicode code points (`[...tag].length`), so non-ASCII tags are not penalised by UTF-16 surrogate pairs.
  - Lower-casing uses `toLowerCase()` (locale-independent).
  - Deduplication keeps the first occurrence's position, so the stored order follows the request order.
  - The in-memory store holds no pre-existing data, so no migration is needed; every stored bookmark gets a `tags` array.
- Open decisions (asked under plan risks; the plan follows the stated proposal unless the plan-approval answer says otherwise):
  - D1 — Web add form: the issue says only that the page shows tags; `index.html`/`main.ts` have no tags input. Proposal: no form input in this item (tags can be added through the API only). README's layout table is likewise left unchanged.
  - D2 — Trim before checks: proposal: the 32-character and whitespace rules apply after trimming, so `" news "` is valid (stored `news`) and `"breaking news"` is rejected.
  - D3 — Empty tag: a tag that is empty after trimming (`""`, `"   "`). Proposal: reject with `400 {"error":"invalid tag"}`.
  - D4 — Malformed `tags`: a `tags` value that is not an array of strings (for example `"news"`, `[1]`, `null`). Proposal: reject with `400 {"error":"invalid tag"}`.
- Delivery notes: a changeset in `.changeset/` with summary "Add tags to bookmarks" is part of Delivery (change intent), per `AGENTS.md`.

## Testing Strategy

- Unit (Vitest, per package, run by `pnpm test` and by the `test` job of the `ci` workflow):
  - `packages/shared`: happy path normalisation (trim, lower-case, dedupe, order), boundary 32 vs 33 characters, whitespace rejection (space, tab), empty tag per D3, input immutability.
  - `packages/api` store: default `[]`, normalised storage, rejection stores nothing, `list()` includes tags.
  - `packages/api` HTTP (integration over a real `http` server on an ephemeral port, as in `app.test.ts`): 201 with tags, 201 without tags, 400 `invalid tag` for too long, whitespace, and malformed `tags` (D4), GET returns tags.
  - `packages/web` (jsdom): tags rendered after the title joined by `", "`; nothing rendered for no tags; existing empty-state and Remove tests still pass.
- Unhappy paths: covered by the 400 cases above, including that a rejected POST leaves `GET /bookmarks` unchanged.
- Static checks: `pnpm lint`, `pnpm typecheck` (the new required `Bookmark.tags` field makes the type-checker flag every construction site).
- No manual, live-app, or end-to-end check is required by the issue; none is planned.
- Release: bundle size measured locally (Task 6); the CI `measure` job reports the same value on the pull request and never fails on its own.

## Operational Requirements

- Merging into `main` requires the status check `test` (GitHub Actions) — where: repository ruleset `main` (id 26033321, target `~DEFAULT_BRANCH`, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `required_status_checks: [{context: "test", integration_id: 15368}]`; owner: repository admin (`panz3r`). This change adds, removes, and renames no CI check contexts; `.github/workflows/ci.yml` runs job `test` on `pull_request`.
- Merging into `main` requires one approving review and squash merge — where: repository ruleset `main` (id 26033321); evidence: same call → `pull_request.required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per `TEAMS.md`, the approval comes from the QA Engineer `duckyduff369`.
- No other external configuration (environments, secrets, deploy configuration, other repositories) is involved: the change is confined to the three workspace packages and `measure/baseline.json`.

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

Task 1 — shared: added `tags` to `Bookmark`, optional `tags` on `NewBookmark`, pure `isValidTag` (trim, non-empty, <=32 code points, no whitespace) and `normalizeTags`; tests added. `pnpm --filter @sample/shared test`: 12 passed.
(commit 855b349)
Task 2 — api store: `BookmarkStore.add` validates every tag (after title/url checks, before the duplicate check and any write) and stores `normalizeTags(tags)`; store tests added (default, normalisation, 4 rejection cases leave store empty).
(commit dfa8b2e)
Task 3 — api HTTP: POST passes `tags` through; a non-array or non-string-element `tags` (D4, including null) throws `ValidationError("invalid tag")` -> 400; integration tests added. `pnpm --filter @sample/api test`: 17 passed.
(commit dfa8b2e)
Task 4 — web: `renderList` appends `<span class="tags">` (textContent, joined by ", ") between the title and Remove only when tags are non-empty; fixtures updated, 2 tests added. `pnpm --filter @sample/web test`: 4 passed.
(commit 06bf444)
Task 6 — `pnpm build` then `pnpm measure`: web_bundle_gzip_bytes=881, web_bundle_gzip_delta=46; set `measure/baseline.json` `web_bundle_gzip_bytes` from 835 to 881.
(commit 0eacf5c)
Task 5 — repository checks from the root
(checked at 0eacf5c)
`pnpm test`: shared 12, api 17, web 4 passed. `pnpm lint`: clean. `pnpm typecheck`: clean. `pnpm measure` after the baseline update: delta 0.

Task 7 — api store: `BookmarkStore.add` now calls `normalizeTags` first and validates each normalised tag with `isValidTag`, so a tag that lower-cases past 32 code points (`"İ".repeat(32)`) is rejected with `invalid tag` before anything is stored. Regression tests: store.test.ts (rejection case `"İ".repeat(32)`, and stored tags all satisfy `isValidTag`), app.test.ts (400 `invalid tag`, absent from GET). Both failed before the fix (5 failures incl. leaked bookmark), pass after. `pnpm test`: shared 12, api 20, web 4 passed; `pnpm lint` clean; `pnpm typecheck` clean; `pnpm build` then `pnpm measure`: delta 0 (881).
(commit PENDING)

Stale-statement sweep — Bookmark, NewBookmark, POST /bookmarks, createdAt, tags (git grep over docs, html, json)
none found (README.md api row only names routes, which are unchanged).

## Validation Evidence

AC-1: passed — api store and app tests: normalised tags, [] default, 201 body includes tags (packages/api/src/store.test.ts, app.test.ts; packages/shared index.test.ts).
AC-2: passed — app.test.ts: 33-char, lower-casing-lengthened (`"İ".repeat(32)`), whitespace, empty, and malformed tags return 400 {"error":"invalid tag"} and are absent from GET /bookmarks.
AC-3: passed — app.test.ts: GET /bookmarks returns each bookmark's tags ([] when none).
AC-4: passed — packages/web/src/render.test.ts: `news, tech` in span.tags after the title; no tag element and item text `ExampleRemove` for [].
AC-5: passed — pnpm test (12+20+4), pnpm lint, pnpm typecheck all pass from the repository root; bundle baseline updated to 881.

## Quality Gate

Gate: concerns — every criterion is evidenced; one minor finding remains.

Acceptance trace:

- AC-1 — implementation: `normalizeTags` (packages/shared/src/index.ts:49), `BookmarkStore.add` defaults to `[]` and stores `normalizeTags(tags)` (packages/api/src/store.ts:17-26), POST passes `tags` (packages/api/src/app.ts:23-28). Verification: packages/shared/src/index.test.ts (trim, lower-case, dedupe, order, immutability), packages/api/src/store.test.ts (default `[]`, normalisation), packages/api/src/app.test.ts (`["News", " news ", "Tech"]` → 201 `["news", "tech"]`; omitted → `[]`). Re-run at 5ccdbfc: passed.
- AC-2 — implementation: `isValidTag` (packages/shared/src/index.ts:43-46) checked for every tag before any write (packages/api/src/store.ts:18); D4 malformed `tags` guard (packages/api/src/app.ts:25-27). Verification: app.test.ts 400 `{"error":"invalid tag"}` and absent from `GET /bookmarks` for 33 characters, a space, empty, a string, a non-string element, and `null`; store.test.ts rejection leaves the store empty; index.test.ts 32 vs 33 boundary, space, tab, empty, blank. Re-run at 5ccdbfc: passed.
- AC-3 — implementation: stored bookmarks carry `tags`, returned by `store.list()`. Verification: app.test.ts `GET /bookmarks` returns `["news", "tech"]` and `[]`; store.test.ts `list()` includes tags. Re-run at 5ccdbfc: passed.
- AC-4 — implementation: `renderList` appends `span.tags` with `textContent = tags.join(", ")` between the link and Remove only when tags are non-empty (packages/web/src/render.ts:21-28). Verification: render.test.ts children `A, SPAN, BUTTON` with `news, tech`; no `.tags` and item text `ExampleRemove` for `[]`. Re-run at 5ccdbfc: passed.
- AC-5 — Vitest tests in all three packages; re-run from the repository root at 5ccdbfc: `pnpm test` exit 0 (shared 12, api 17, web 4), `pnpm lint` exit 0, `pnpm typecheck` exit 0. Also `pnpm build` then `pnpm measure`: `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0` against the updated `measure/baseline.json`.

Findings:

- minor — packages/shared/src/index.ts:43-51 (used by packages/api/src/store.ts:18,26): validation runs on the submitted tag but `normalizeTags` lower-cases afterwards, and `toLowerCase()` can lengthen a string, so a stored tag can exceed the 32-character limit of AC-2 and fail `isValidTag` itself. Reproduced at 5ccdbfc: `isValidTag("İ".repeat(32))` is `true`, `normalizeTags(["İ".repeat(32)])[0]` has 64 code points, and `isValidTag` of that stored value is `false`. Fix by validating the normalised tag (or checking the length after lower-casing) and adding a test.

Residual risks: none.

Unmet required validations: none.

Stale-statement sweep: README.md, AGENTS.md, TEAMS.md, scenarios/README.md, .changeset/, and the comments and test descriptions in the changed packages hold no statement the change makes untrue (README's `packages/api` row names only routes, which are unchanged; D1 leaves the web form without a tags input).

Reviewed head: 5ccdbfc17f5de20d7cc8c5ffc84661b1fe49bc37

## Review Record

## Change Log

- 2026-11-03 — Plan: drafted from FIJIH-76 at source revision 2026-11-03T12:22:07.636+0100; issue assigned to Mattia Panzeri.
- 2026-11-03 — Approved: plan-approval — Approve with the proposed answers: 1. No to both. 2. Yes. 3. 400. 4. Yes. Publish: yes. Notify: no.
- 2026-11-03 — Implementation: tasks 1-6 done. Decisions applied: D1 no web form input or README change; D2 trim before checks; D3 empty tag rejected 400; D4 malformed tags rejected 400 invalid tag. Jira FIJIH-76 moved to In Progress.
- 2026-11-03 — Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-03 — Finalize: checked every task and acceptance criterion against branch commits 855b349..af4faee; all have evidence (Task 5 cites 0eacf5c). Added `(commit <hash>)` lines to the Implementation Record entries for Tasks 1-4 and 6 (routine reconciliation). File List and Validation Evidence match the branch diff; no bookkeeping slips. Open follow-up from the Quality Gate minor finding: validate the normalised tag so lower-casing cannot push a stored tag past 32 characters.
- 2026-11-03 — Re-entry 2: user-request — checkpoint local-qa-review at branch tip 9cb4c3e; user decision: "Request more work: fix the finding first, as you recommend. Validate the normalised tag in BookmarkStore.add and add a regression test." Task 7 appended.
