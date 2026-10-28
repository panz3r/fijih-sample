---
schema: fiji/work-item/v1
id: FIJIH-36
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-36
  revision: 2026-10-28T14:00:12.914+0100
lifecycle:
  status: active
  phase: remote-review
  checkpoint: null
  transition: review-requested
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-36-add-tags
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/1
  jira_context_comment_id: null
---

# Work Item FIJIH-36: Add tags to bookmarks

## Story

As a user,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

Source: Jira FIJIH-36 (Story, Medium), revision `2026-10-28T14:00:12.914+0100`. No comments, attachments, links, or Figma URLs.

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

Open product questions (also under the Plan result's risks; none blocks drafting):

- Q1. The add form in `packages/web/index.html` has only Title and URL inputs. The issue says the page *shows* tags, not that a user can *enter* them. Is a tags input on the add form in scope? This plan assumes **no** (tags are set only through the API), so the page displays tags but cannot create them.
- Q2. Is a non-array `tags` value, or an array entry that is not a string, a 400 `{"error":"invalid tag"}`? This plan assumes **yes**.
- Q3. Is a tag that is empty after trimming (for example `"  "`) a 400 `{"error":"invalid tag"}`, or silently dropped? This plan assumes **400**.
- Q4. Is the 32-character limit checked after trimming? This plan assumes **yes** (validation runs on the trimmed value, so leading and trailing whitespace is trimmed, not rejected; only inner whitespace is rejected).

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, duplicates are removed keeping first-occurrence order, and the `201` response body carries the resulting `tags`. When `tags` is omitted the bookmark has `tags: []`.
2. `POST /bookmarks` with a tag that is longer than 32 characters (after trimming), contains whitespace (after trimming), is empty after trimming, is not a string, or with a `tags` value that is not an array answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, joined with `", "`; a bookmark with no tags shows no tag text and no tag element.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour of criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] T1. Shared tag model and normaliser (AC: 1, 2, 5)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` (or `readonly string[]`) to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure `normalizeTags(value: unknown): string[]` that returns `[]` for `undefined`, trims, lower-cases, and deduplicates (first occurrence wins), and throws (or signals) invalid for a non-array, a non-string entry, an empty trimmed tag, a trimmed tag over 32 characters, or a trimmed tag containing whitespace. Export `MAX_TAG_LENGTH = 32`.
  - [x] Tests in `packages/shared/src/index.test.ts`: default `[]`, trim + lower-case + dedupe, exactly 32 characters accepted, 33 rejected, inner space and tab rejected, empty-after-trim rejected, non-array and non-string rejected.
- [x] T2. API accepts, stores, and returns tags (AC: 1, 2, 3, 5)
  - [x] `packages/api/src/store.ts`: `add` normalises tags via `normalizeTags`, maps invalid input to `ValidationError("invalid tag")`, and stores `tags` on the bookmark; validation happens before insertion so a rejected request stores nothing.
  - [x] `packages/api/src/app.ts`: pass `body.tags` through to `store.add`.
  - [x] Tests in `packages/api/src/app.test.ts`: POST with mixed-case, padded, duplicate tags returns normalised tags; POST without tags returns `tags: []`; each invalid case answers `400 {"error":"invalid tag"}` and the list is unchanged; GET returns tags per bookmark.
- [x] T3. Web page shows tags after the title (AC: 4, 5)
  - [x] `packages/web/src/render.ts`: after the link, when `bookmark.tags.length > 0`, append an element (for example `<span class="tags">`) whose text is `bookmark.tags.join(", ")`; append nothing otherwise. Use `textContent`, never HTML.
  - [x] Tests in `packages/web/src/render.test.ts`: tags render after the title comma separated; no tag element when `tags` is `[]`; update existing fixtures to include `tags`.
- [x] T4. Bundle size baseline (AC: 5)
  - [x] Run `pnpm build` then `pnpm measure`; if `web_bundle_gzip_delta` is non-zero, update `measure/baseline.json` `web_bundle_gzip_bytes` to the new value in this change (AGENTS.md).
- [x] T5. Change intent (AC: 5)
  - [x] Add a changeset in `.changeset/` whose summary is `Add tags to bookmarks`, bumping `@sample/shared`, `@sample/api`, and `@sample/web` (patch/minor per team convention; minor for a new feature).
- [x] T6. Full checks (AC: 5)
  - [x] Run `pnpm test`, `pnpm lint`, `pnpm typecheck` from the repository root and record results.

## Engineering Context

- Workspace: `packages/shared` (types and pure functions) is imported from source by `packages/api` and `packages/web` (AGENTS.md).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, URL helpers. Tag normalisation belongs here as a pure function so API and tests share it.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 {"error": message}`. Reusing that path gives `{"error":"invalid tag"}` without new HTTP code.
  - `packages/api/src/app.ts` — POST handler currently builds `{ url, title }` from the body; it must forward `tags`.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with `<a>` (title) and a Remove `<button>`; tags go between them. `index.html` styles `li` as flex with `space-between`; a tags span between link and button stays readable but layout polish is not required by the issue.
  - `packages/web/src/main.ts` — submits only title and url; unchanged under the Q1 assumption.
- Validation order in `store.add`: keep existing title and url checks first, then tags, so existing error messages are unchanged for existing cases. A request with both a bad URL and a bad tag reports the URL error.
- Storage is in-memory (`Map`); there is no persisted data, so no migration is needed.
- `Bookmark.tags` becomes required; every fixture constructing a `Bookmark` (for example `render.test.ts`) must add `tags`.

## Testing Strategy

- Unit (`packages/shared`, Vitest): `normalizeTags` happy path, boundaries (32 vs 33 chars), whitespace rules, dedupe order, invalid types.
- Integration (`packages/api`, Vitest against a real `http` server on an ephemeral port, as the existing `app.test.ts` does): POST with and without tags, every invalid-tag variant returning `400 {"error":"invalid tag"}` without storing, GET round trip.
- Unit (`packages/web`, Vitest + jsdom): rendering with tags, without tags, and existing empty-state and Remove behaviour unchanged.
- Unhappy paths are covered in shared and api tests above. No migration, design (no Figma), or end-to-end checks apply; no manual live-app check is required by the issue.
- Release: changeset (T5) and bundle baseline (T4). No criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) must pass before merge — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`, and `.github/workflows/ci.yml` defines job `test` on `pull_request`; owner: repository admin (`panz3r`).
- One approving review, squash merge only — where: same ruleset `main`; evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`; `gh api repos/panz3r/fijih-sample/collaborators/duckyduff369/permission` returned `write`.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected". This change adds, removes, or renames no CI check contexts. No environments, secrets, deploy configuration, or other repositories are involved.

## File List

- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`
- `packages/api/src/store.ts`
- `packages/api/src/app.ts`
- `packages/api/src/app.test.ts`
- `packages/web/src/render.ts`
- `packages/web/src/render.test.ts`
- `measure/baseline.json`
- `.changeset/add-bookmark-tags.md`

## Implementation Record

- T1: Added tags to Bookmark/NewBookmark, MAX_TAG_LENGTH, InvalidTagError, and normalizeTags (signals invalid by throwing InvalidTagError). Shared test (9 tests), lint, typecheck passed.
- T2: store.add normalises tags after title/url checks, maps InvalidTagError to ValidationError('invalid tag'); app.ts forwards body.tags. API test (9 tests), lint, typecheck passed.
- T3: renderList appends span.tags (textContent, joined with ', ') between link and Remove only when tags exist; fixtures updated. Web test (4 tests), lint, typecheck passed.
- T4: pnpm build then pnpm measure: 881 bytes, delta +46 from 835; baseline updated to 881 (re-measure delta 0).
- T5: Added changeset 'Add tags to bookmarks' with minor bumps for shared, api, web.
- T6: Root pnpm test, pnpm lint, pnpm typecheck all passed.
- Review fix (Copilot thread PRRT_kwDOVaYq_M6xIhYX): `normalizeTags` counts code points (`[...tag].length`) and a non-ASCII boundary test was added in `packages/shared/src/index.test.ts`; commit ed83a25 (pushed). Root test, lint, typecheck passed; bundle 881 bytes, delta 0.

## Validation Evidence

- AC-1: passed — shared normalizeTags tests and api POST tests (normalised tags, default []) (pnpm test)
- AC-2: passed — api tests for each invalid case answer 400 {"error":"invalid tag"} and list unchanged; shared boundary tests (pnpm test)
- AC-3: passed — api GET round-trip test returns tags per bookmark (pnpm test)
- AC-4: passed — web render tests: tags after title joined with ", ", no element when empty (pnpm test)
- AC-5: passed — per-package tests, and root pnpm test, pnpm lint, pnpm typecheck pass; bundle baseline 881 bytes (delta 0)

## Quality Gate

Gate: concerns

Reviewed head: ee7e4fca1e10283f5a4f6b5cd644ebd5e4d953f6

Scope: full branch diff `main...FIJIH-36-add-tags` (attempt 1, no re-entry). Root `pnpm test` (shared 9, api 9, web 4), `pnpm lint`, and `pnpm typecheck` re-run at the reviewed head: all passed.

Acceptance trace:

- AC-1: implementation `normalizeTags` in `packages/shared/src/index.ts` (trim, lower-case, `Set` dedupe in first-occurrence order, `undefined` gives `[]`), called by `BookmarkStore.add` in `packages/api/src/store.ts`; `packages/api/src/app.ts` forwards `body.tags`. Verification: `packages/shared/src/index.test.ts` (default, trim/lower/dedupe order) and `packages/api/src/app.test.ts` ("normalises tags, defaults to [], and returns them from GET": 201 body tags `["work","home"]`, omitted gives `[]`). Met.
- AC-2: implementation `normalizeTags` throws `InvalidTagError` for non-array, non-string entry, and trimmed empty, over-32, or whitespace-containing tags; `store.add` maps it to `ValidationError("invalid tag")` before `items.set`, so nothing is stored. Verification: shared tests (32 accepted, 33 rejected, padded 32 accepted, space and tab, empty, `1`, `null`, string, object) and api `it.each` cases (too long, inner whitespace, empty after trim, non-string, non-array) asserting `400 {"error":"invalid tag"}` and an unchanged list count. Met.
- AC-3: implementation stores `tags` on the `Bookmark` returned by `store.list()`. Verification: api GET round-trip in the same test (`["work","home"]` and `[]`). Met.
- AC-4: implementation `packages/web/src/render.ts` appends `span.tags` with `textContent = tags.join(", ")` after the link only when tags exist. Verification: `packages/web/src/render.test.ts` ("shows tags after the title" checks text `a, b` and that it is the link's next sibling; "renders no tag element without tags" checks no `.tags` and text `ExampleRemove`). Met.
- AC-5: Vitest tests added in all three packages; root `pnpm test`, `pnpm lint`, `pnpm typecheck` passed (re-run in this review); bundle baseline updated to 881 bytes with re-measure delta 0; changeset `.changeset/add-bookmark-tags.md` summary `Add tags to bookmarks`. Met.

Plan decisions vs criteria: Q1 (no tags input on the add form), Q2 (non-array/non-string is 400), Q3 (empty after trim is 400), and Q4 (limits after trimming) are consistent with AC-2 and AC-4; none contradicts a criterion.

Findings:

- minor — `packages/shared/src/index.ts` (`normalizeTags`): the 32-character limit counts UTF-16 code units (`tag.length`), not characters. Reproduced: a tag of 20 emoji (20 code points, 40 code units) is rejected with `invalid tag`. ASCII tags behave as AC-2 states; only astral-plane characters are affected. Follow-up: count with `[...tag].length` and add a non-ASCII boundary test.

Residual risks:

- Operational Requirements entries carry recorded evidence; none is `evidence: unverified`. No Validation Evidence line is `deferred` and no criterion is `pending-ci`.

## Review Record

- Copilot review PRR_kwDOVaYq_M8AAAABUr2OPg, thread PRRT_kwDOVaYq_M6xIhYX (`packages/shared/src/index.ts`, tag length counts UTF-16 units): valid; fixed in ed83a25; replied and resolved. Copilot re-review (13:15:30Z, head ed83a25): approval recommended, no new findings.

## Change Log

- 2026-10-28: Plan drafted from FIJIH-36 revision `2026-10-28T14:00:12.914+0100`; issue assigned to Mattia Panzeri.
- 2026-10-28: Approved: plan-approval — approve, assumptions are correct
- 2026-10-28: T1 implemented
- 2026-10-28: T2 implemented
- 2026-10-28: T3 implemented
- 2026-10-28: T4 implemented
- 2026-10-28: T5 implemented
- 2026-10-28: T6 implemented; implementation complete, awaiting implementation-approval
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Finalize: all tasks checked and all acceptance criteria have Validation Evidence; no blocking gaps; set checkpoint local-qa-review (gate concerns carried forward)
- 2026-10-28: Approved: local-qa-review — approve
- 2026-10-28: Delivery: committed change intent already on branch (.changeset/add-bookmark-tags.md, summary matches PR title without key, no change); pushed FIJIH-36-add-tags; opened draft PR #1 (base main, label enhancement, assignee panz3r); requested Copilot review (confirmed review_requested event on timeline)
- 2026-10-28: Copilot pass: 1 finding valid and fixed (ed83a25), thread resolved, re-review clear; set checkpoint ready-for-review
- 2026-10-28: Approved: ready-for-review — approve
- 2026-10-28: Ready-for-review: marked PR #1 ready; requested review from duckyduff369 (QA Engineer, owning team Bookmarks; the only other member besides the author panz3r); confirmed review_requested on the timeline
