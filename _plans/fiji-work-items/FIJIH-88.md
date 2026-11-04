---
schema: fiji/work-item/v1
id: FIJIH-88
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-88
  revision: 2026-11-04T15:55:12.410+0100
lifecycle:
  status: active
  phase: qa-review
  checkpoint: local-qa-review
  transition: qa-reviewed
  attempt: 2
routing:
  class: standard
  source: user
  implementation_tier: standard
quality:
  gate: pass
artifacts:
  branch: FIJIH-88-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-88: Add tags to bookmarks

## Story

As a user who saves many bookmarks,
I want to give each bookmark an optional list of tags and see them next to its title,
so that I can group related bookmarks.

## Product Context

Source: Jira FIJIH-88 (Story, Medium, label `scenario-S1`), revision `2026-11-04T15:55:12.410+0100`. No comments, attachments, links, or Figma references.

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

Open product decisions (asked under the Plan result's `risks`; each has a proposed answer the `plan-approval` decision can accept or change):

- **D1 — Empty tag.** A tag that is empty after trimming (`""`, `"   "`). Proposed: reject with 400 `{"error":"invalid tag"}`, like the other invalid tags.
- **D2 — Malformed `tags` value.** `tags` present but not an array (for example `"work"` or `null`), or an element that is not a string. Proposed: 400 `{"error":"invalid tag"}`.
- **D3 — Tags input on the add form.** The issue asks the page to show tags but not to enter them, so without an input tags can be set only through the API. Proposed: out of scope (no form change).
- **D4 — README.** The `packages/shared` row in `README.md` lists the shared functions ("URL validation and normalisation, sorting"). Proposed: add "tag normalisation" to that row.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, and duplicates (compared after normalisation) are removed, keeping the first occurrence's position. The 201 response body includes the normalised `tags`. Without `tags`, the bookmark gets `tags: []`.
2. When any tag, after trimming, is longer than 32 characters or contains whitespace, `POST /bookmarks` answers 400 with body `{"error":"invalid tag"}` and stores no bookmark. A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` when it has none).
4. The web page shows each bookmark's tags after its title, joined with `", "` (for example `work, reading`), and renders no tag element or text when the bookmark has no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in AC 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. Handling of an empty tag (D1) and of a malformed `tags` value (D2) follows the `plan-approval` decision, and is covered by tests in `packages/shared` and `packages/api`.

## Tasks and Subtasks

- [x] Shared: tag model and normalisation (AC: 1, 2, 5, 6)
  - [x] Add `tags: string[]` to `Bookmark` and optional `tags?: string[]` to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure function that normalises a tags input: trim, validate (length ≤ 32, no whitespace, plus D1/D2 as decided), lower-case, de-duplicate keeping first occurrence; report an invalid tag so the API can answer `invalid tag`.
  - [x] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, de-duplication across case and padding (`[" Work", "work "]` → `["work"]`), order kept, `undefined` → `[]`, 32 characters accepted, 33 rejected, inner whitespace rejected, D1 and D2 cases.
- [x] API: accept, store, and return tags (AC: 1, 2, 3, 5, 6)
  - [x] In `packages/api/src/store.ts`, normalise `input.tags` with the shared function in `BookmarkStore.add`, throw `ValidationError("invalid tag")` for an invalid tag before storing, and store `tags` on the bookmark.
  - [x] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add` (widen the body type; validation stays in the store/shared function).
  - [x] Tests in `packages/api/src/app.test.ts` and/or `store.test.ts`: POST with tags returns normalised tags; POST without tags returns `tags: []`; GET lists tags; an over-long tag and a tag with inner whitespace answer 400 `{"error":"invalid tag"}` and the list is unchanged; D1 and D2 cases.
- [x] Web: show tags after the title (AC: 4, 5)
  - [x] In `packages/web/src/render.ts`, after the title link, render an element (for example `<span class="tags">`) whose text is the tags joined with `", "`, only when the bookmark has at least one tag.
  - [x] Keep the tags next to the title under the existing `li { display: flex; justify-content: space-between }` rule in `packages/web/index.html` (for example by grouping the link and the tags element, with a small gap before the tags).
  - [x] Tests in `packages/web/src/render.test.ts`: a bookmark with tags renders `work, reading` after the link; a bookmark with `tags: []` renders no tags element and the item text is unchanged; update existing fixtures for the new required `tags` field.
- [x] Bundle size baseline (AC: 5)
  - [x] Run `pnpm build` then `pnpm measure`; the web change moves the gzipped bundle, so set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in the same change (AGENTS.md).
- [x] README (D4, only if the `plan-approval` decision accepts it) (AC: 5)
  - [x] Add tag normalisation to the `packages/shared` row in `README.md`.
- [x] Run the root checks `pnpm test`, `pnpm lint`, `pnpm typecheck` and record the output in Validation Evidence (AC: 5)
- [x] De-duplicate tags with a `Set` in `normalizeTags` and add a test (re-entry 2; AC: 1, 5)
  - [x] In `packages/shared/src/index.ts`, replace `out.includes(lower)` with a `Set` lookup, keeping first-occurrence order.
  - [x] Add a Vitest test in `packages/shared/src/index.test.ts` that de-duplicates a large input (for example 50,000 distinct tags plus repeats) correctly and quickly.
  - [x] Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` then `pnpm measure` (baseline moves only if the bundle size does).

## Engineering Context

- Layout: pnpm workspace; `packages/shared` (types and pure functions, imported from source by the others via `@sample/shared`), `packages/api` (Node `http` server in `src/app.ts`, in-memory `BookmarkStore` in `src/store.ts`), `packages/web` (Vite page; `src/render.ts` builds the list, `src/main.ts` fetches and posts).
- Validation pattern: `BookmarkStore.add` throws `ValidationError(message)`; `createApp` maps it to 400 `{ error: message }`. Using `ValidationError("invalid tag")` gives the required body with no change to the error mapping. A non-JSON body already answers 400 `invalid json`.
- Order of checks in `add`: title, URL format, then tags, then the duplicate-URL check (engineering choice; the issue sets no precedence between errors).
- Normalisation order: trim → validate → lower-case → de-duplicate. "Contains whitespace" is tested after trimming with `/\s/`, so leading and trailing spaces are trimmed, never rejected. Length is counted in characters (code points, `[...tag].length`) after trimming and before lower-casing, so a tag is rejected only when longer than 32. Lower-casing uses `toLowerCase()` (locale-independent).
- No limit on the number of tags: the issue sets none.
- `Bookmark.tags` is required (`string[]`), so every stored and returned bookmark carries it; the web test fixtures must add `tags`.
- `src/main.ts` needs no change for display: `renderList` receives the API objects with `tags`. With D3 out of scope, the POST body from the form stays `{ title, url }`.
- Bundle: `scripts/measure` compares the gzipped `packages/web/dist/assets/*.js` to `measure/baseline.json` (835 bytes on `main`); it never fails, and the CI `measure` job only reports.
- Out of scope per the issue: filtering or searching by tag, and editing tags of an existing bookmark. `DELETE /bookmarks/:id` and `GET /health` are unaffected.
- Change intent: the pull request changes packages, so Delivery adds a changeset in `.changeset/` with summary `Add tags to bookmarks` (AGENTS.md).

## Testing Strategy

- Unit (Vitest), one per package, per AGENTS.md:
  - `packages/shared`: happy path (trim, lower-case, de-duplicate, order, default `[]`), boundaries (32 vs 33 characters), unhappy (inner whitespace, D1, D2).
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port (existing pattern in `app.test.ts`): POST with and without tags, GET returns tags, 400 `{"error":"invalid tag"}` with no bookmark stored, D1 and D2.
  - `packages/web`: jsdom tests of `renderList` with and without tags.
- Per-package commands: `pnpm --filter @sample/<pkg> test`, `pnpm lint packages/<pkg>`, `pnpm --filter @sample/<pkg> typecheck`; then the root `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Bundle: `pnpm build` then `pnpm measure`; baseline updated in the same change.
- No live-app or end-to-end check: the issue asks for unit tests in the three packages, and the project has no end-to-end suite.
- CI: the `ci` workflow (`test`, `lint`, `typecheck`, `measure`) runs on the pull request; no criterion is CI-only.

## Operational Requirements

- Merging into `main` requires the `test` status check (from the `test` job of `.github/workflows/ci.yml`, which runs on `pull_request`) — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with `[{"context":"test","integration_id":15368}]`; owner: repository admin (`panz3r`).
- Merging into `main` requires one approving review and allows only squash merges — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — where: GitHub branch protection; evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected"; owner: repository admin (`panz3r`).
- The change adds, removes, or renames no CI check context, and needs no environment, secret, deploy configuration, or other repository.

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
- README.md

## Implementation Record

Task 1 — Shared tag model and `normalizeTags`
(commit 5fa0c28)

Added `tags` to `Bookmark`, optional `tags` to `NewBookmark`, and pure `normalizeTags(unknown): string[] | null` (trim, validate, lower-case, de-duplicate; null for D1/D2/invalid). Tests cover trimming, case, de-dup, order, default, 32/33, inner whitespace, empty, malformed. `pnpm --filter @sample/shared test`: 11 passed.
Task 2 — API accepts, stores, and returns tags
(commit d3c2a50)

`BookmarkStore.add` normalises tags after the URL check and throws `ValidationError("invalid tag")`; `createApp` passes `body.tags` through. HTTP tests cover tags normalised, none -> `[]`, GET lists tags, 32 accepted, and 400 `{"error":"invalid tag"}` with nothing stored for too long, inner whitespace, empty (D1), non-array, null, and non-string (D2). `pnpm --filter @sample/api test`: 13 passed.
Task 3 — Web shows tags after the title
(commit 6da6425)

`renderList` groups the link and an optional `<span class="tags">` (tags joined with ", ") in a `.title` span, only when tags exist; CSS adds a small gap. Tests cover tags after the link, no element for `[]`, and updated fixtures. `pnpm --filter @sample/web test`: 4 passed.
Task 4 — Bundle size baseline
(commit fbf0513)

`pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=895` (delta 60 from 835); baseline set to 895.
Task 5 — README row
(commit ba735f8)

Added "tag normalisation" to the `packages/shared` row, as D4 was approved.
Task 6 — Root checks
(checked at ba735f8)

`pnpm test`: shared 11, api 13, web 4 passed. `pnpm lint`: exit 0. `pnpm typecheck`: exit 0. Per-package `pnpm lint packages/{shared,api,web}`: exit 0.

Task 7 — De-duplicate tags with a `Set`
(commit 307e30b)

`normalizeTags` now tracks seen tags in a `Set` (insertion order keeps the first occurrence), removing the quadratic `includes`. New shared test de-duplicates 50,000 distinct tags plus upper-case repeats, expecting the distinct list in order in under 1 s. `pnpm test`: shared 12, api 13, web 4 passed; `pnpm lint` and `pnpm typecheck`: exit 0; `pnpm build` then `pnpm measure`: 895 bytes, delta 0, baseline unchanged.

Stale-statement sweep — `Bookmark`, `NewBookmark`, `POST /bookmarks`, `createdAt`, bundle baseline `835`, `tags`

none found (README api row lists routes only; the shared row was updated by task 5; scenarios and `_plans` are historical).

Stale-statement sweep (re-entry 2) — `normalizeTags`, `includes`, de-duplication wording

none found (the doc comment on `normalizeTags` stays true).

## Validation Evidence

- AC-1: passed — `packages/api/src/app.test.ts` "accepts tags, normalises them, and lists them" and "gives an empty tags list without tags"; shared `normalizeTags` tests.
- AC-2: passed — API `it.each` rejects over-long (33) and inner-whitespace tags with 400 `{"error":"invalid tag"}`, nothing stored; 32 characters accepted.
- AC-3: passed — API tests assert GET lists `tags` (`[]` when none).
- AC-4: passed — `packages/web/src/render.test.ts`: `work, reading` after the link; no `.tags` element for `[]`.
- AC-5: passed — `pnpm test` (shared 12, api 13, web 4), `pnpm lint`, `pnpm typecheck` all exit 0 after the Set de-duplication change.
- AC-6: passed — D1 (empty) and D2 (non-array, null, non-string) answer 400 `invalid tag`, covered in shared and API tests.
- Bundle: `pnpm build` then `pnpm measure`: 895 gzip bytes (baseline updated from 835).

## Quality Gate

Gate: `pass` — every criterion is evidenced, every required validation passed, and no finding or residual risk remains.

Reviewed head: 307e30bda7852307effcb4bc198bffab17e1c129 (scoped review: the latest Change Log `Re-entry` is `user-request` (Re-entry 2), so the scope is the commits since the previous `Reviewed head` 85801ab — ab60fe7, 54646d0 and 2f9866e (work item only) and 307e30b (`packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`) — plus AC-1 and AC-5, named by task 7's `(AC: 1, 5)` mapping; the AC-5 Validation Evidence line also changed. No `Scope change:` entry.)

Validations re-run by this review at 307e30b: `pnpm test` exit 0 (shared 12, api 13, web 4 passed); `pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm build` exit 0 then `pnpm measure` printed `web_bundle_gzip_bytes=895`, `web_bundle_gzip_delta=0` (matches `measure/baseline.json`).

Acceptance trace, in scope:

- AC-1 — implementation: `normalizeTags` in `packages/shared/src/index.ts` now de-duplicates through a `Set` (`seen.add(lower)`, returns `[...seen]`); `Set` iteration follows insertion order, so the first occurrence keeps its position; trim, validation, lower-casing and `undefined` → `[]` are unchanged. `BookmarkStore.add` (`packages/api/src/store.ts`) and `createApp` (`packages/api/src/app.ts`) are unchanged since 85801ab. Verification at 307e30b: shared "de-duplicates across case and padding" (`[" Work", "work "]` → `["work"]`, `["b","a","B","c","a"]` → `["b","a","c"]`), new "de-duplicates a large input correctly and quickly" (50,000 distinct tags plus their upper-case repeats → the distinct list in order, under 1 s), and API "accepts tags, normalises them, and lists them" / "gives an empty tags list without tags".
- AC-5 — Vitest tests in all three packages cover AC 1–4; `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0 from the root, re-run by this review at 307e30b.

Acceptance trace, carried forward (out of scope; traced from the current Validation Evidence lines, whose code and tests the reviewed commits do not change):

- AC-2 — passed: API `it.each` rejects over-long (33) and inner-whitespace tags with 400 `{"error":"invalid tag"}`, nothing stored; 32 characters accepted (re-run green at 307e30b).
- AC-3 — passed: API tests assert GET lists `tags` (`[]` when none).
- AC-4 — passed: `packages/web/src/render.test.ts` shows `work, reading` after the link; no `.tags` element for `[]`.
- AC-6 — passed: D1 (empty) and D2 (non-array, `null`, non-string) answer 400 `invalid tag`, covered in shared and API tests.
- Bundle: 895 gzip bytes at 307e30b, delta 0.

Previous finding resolved: the `minor` quadratic de-duplication finding in `normalizeTags` (Reviewed head 85801ab) no longer reproduces at 307e30b. The same repro on a separate `createApp` server: `POST /bookmarks` with 100,000 distinct tags (888,940-byte body) answered 201 after 31 ms, and a `GET /health` sent 0.3 s into it answered in 7 ms; `normalizeTags` alone took 1.9 ms for 10,000, 6.2 ms for 50,000 and 13.4 ms for 100,000 tags (was 69 ms, 1,461 ms and 6,549 ms). The optional tag-count or body-size cap was not added; it was optional in the finding, and the issue sets no tag-count limit.

Adversarial review of 307e30b: the doc comment on `normalizeTags` stays true; invalid inputs still return `null` before any result is built; the new test's 1 s bound has wide headroom (the whole shared suite ran its tests in 31 ms). Stale-statement sweep (`normalizeTags`, `includes`, de-duplication wording) across `README.md`, `scenarios/`, agent instructions, comments and test descriptions: none found.

Carried forward from the previous review: no residual risks and no notes; its only finding is resolved above.

Findings: none.

Residual risks: none.

Unmet required validations: none.

Notes: none.

## Review Record

## Change Log

- 2026-11-04 — Plan: drafted from FIJIH-88 revision `2026-11-04T15:55:12.410+0100`; issue assigned to Mattia Panzeri. Open decisions D1–D4 await `plan-approval`.
- 2026-11-04 — Approved: plan-approval — Approve with the proposed answers: D1 400 {"error":"invalid tag"}; D2 400 {"error":"invalid tag"}; D3 out of scope; D4 yes, update the README row. Nothing to defer or grant. class standard. Publish: when Local QA passes cleanly, push this branch to origin, create or update its draft pull request, and request Copilot review without stopping at local-qa-review.
- 2026-11-04 — Routed: implementation — standard (score 6; source user; binding inherit)
- 2026-11-04 — Implementation: shared tag normalisation added.
- 2026-11-04 — Implementation: API tags added.
- 2026-11-04 — Implementation: web tags display added.
- 2026-11-04 — Implementation: baseline updated to 895 bytes.
- 2026-11-04 — Implementation: README row updated (D4).
- 2026-11-04 — Implementation: all tasks complete; root checks pass; stale-statement sweep found nothing.
- 2026-11-04 — Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-04 — Quality review: gate `concerns` at 85801ab; one minor finding (quadratic tag de-duplication).
- 2026-11-04 — Finalize: checked tasks 1–6 and AC-1–AC-6 against commits 5fa0c28, d3c2a50, 6da6425, fbf0513, ba735f8 and the `(checked at ba735f8)` citation on task 6; no discrepancies. Added `(commit <hash>)` lines to the Implementation Record entries of tasks 1–5 (routine reconciliation); File List already matched the branch diff. Set checkpoint `local-qa-review`, transition `qa-reviewed`. Follow-up: the quality gate minor finding (quadratic de-duplication in `normalizeTags`) is carried to the result for the local QA checkpoint.
- 2026-11-04 — Re-entry 2: user-request — checkpoint `local-qa-review`, branch tip 54646d0, user decision: "Fix now: de-duplicate with a Set and add a test, then re-review." Appended one task for the quality gate minor finding.
- 2026-11-04 — Implementation: re-entry 2 task done; `normalizeTags` de-duplicates with a Set, test added, all checks pass.
- 2026-11-04 — Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-04 — Quality review: gate `pass` at 307e30b (scoped re-review after Re-entry 2); the quadratic de-duplication finding is resolved.
- 2026-11-04 — Finalize: checked tasks 1–7 and AC-1–AC-6 against commits 5fa0c28, d3c2a50, 6da6425, fbf0513, ba735f8, the `(checked at ba735f8)` citation on task 6, and 307e30b (task 7); no discrepancies. Added the `(commit 307e30b)` line to the Task 7 Implementation Record entry (routine reconciliation); File List already matched the branch diff. Set checkpoint `local-qa-review`, transition `qa-reviewed`. No follow-ups.
