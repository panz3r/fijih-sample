---
schema: fiji/work-item/v1
id: FIJIH-48
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-48
  revision: "2026-10-29T16:12:10.397+0100"
lifecycle:
  status: active
  phase: remote-review
  checkpoint: jira-handoff
  transition: handoff-drafted
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-48-add-tags-to-bookmarks
  base_branch: main
  pull_request: https://github.com/panz3r/fijih-sample/pull/9
  jira_context_comment_id: null
---

# Work Item FIJIH-48: Add tags to bookmarks

## Story

As a user who keeps many bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group related bookmarks.

## Product Context

Source: Jira FIJIH-48 (Story, Medium, label `scenario-S18`), revision `2026-10-29T16:12:10.397+0100`, no comments, no attachments, no Figma reference.

Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."

Issue acceptance criteria, quoted:

- POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
- GET /bookmarks returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.

Decisions (from the issue):

- Tags are not filterable yet.

Out of scope (from the issue):

- Filtering or searching by tag.
- Editing tags of an existing bookmark.

Open product questions (asked at `plan-approval`; the proposed answer is what the plan assumes until the user decides):

1. Blank tags: a tag that is empty after trimming (`""`, `"   "`). Proposed: reject with 400 `{"error":"invalid tag"}`, because a blank tag cannot group anything. Alternative: drop it silently.
2. Malformed `tags`: a `tags` value that is not an array, or an array element that is not a string. Proposed: 400 `{"error":"invalid tag"}`.
3. Length and whitespace rules apply to the trimmed tag (so `"  news  "` is valid and stored as `"news"`, while `"two words"` is rejected), and length counts JavaScript string length. Proposed: yes.
4. Order of returned tags: first-occurrence order of the input after normalisation (`["B", "a", "b"]` becomes `["b", "a"]`). Proposed: yes; alternative: sorted alphabetically.
5. Web add form: the issue says the page *shows* tags but does not say whether the page's add form gets a tags input. Proposed: out of scope (tags are set through the API only); the user decides.
6. `README.md` describes `packages/shared` as "URL validation and normalisation, sorting" and the API endpoints without payloads. Proposed: leave it unchanged; the user decides whether to mention tags there.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed, lower-cased, and deduplicated after normalisation, in first-occurrence order (open question 4). When `tags` is omitted, the bookmark is stored with `tags: []`. The 201 response body contains the normalised `tags`.
2. A tag that, after trimming (open question 3), is longer than 32 characters or contains whitespace makes `POST /bookmarks` answer 400 with exactly `{"error":"invalid tag"}`, and no bookmark is stored. A tag of exactly 32 characters is accepted. (Blank and malformed tags follow open questions 1 and 2.)
3. `GET /bookmarks` returns a `tags` array on every bookmark: the normalised tags, or `[]` when it has none.
4. The web page shows each bookmark's tags after its title as one text joined by `", "` (for example `news, tech`), and adds no tag element or text for a bookmark with no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 4, including the 32/33-character boundary, inner whitespace, case and duplicate folding, the omitted-`tags` default, and the no-tags rendering.
6. Project conventions from `AGENTS.md` hold: `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root; the change adds a changeset in `.changeset/` whose summary is `Add tags to bookmarks`; and `measure/baseline.json` holds the gzipped web bundle size that `pnpm build` then `pnpm measure` prints on this branch.

## Tasks and Subtasks

- [x] Shared types and pure functions in `packages/shared/src/index.ts` (AC: 1, 2, 3)
  - [x] Add `tags: string[]` to `Bookmark`; widen `NewBookmark` to `Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] }`.
  - [x] Add `isValidTag(tag: string): boolean`: true when the trimmed tag is at most 32 characters and has no whitespace (`/\s/`), plus the blank-tag rule from open question 1.
  - [x] Add `normalizeTags(tags: readonly string[]): string[]`: trim, lower-case, deduplicate in first-occurrence order.
- [x] Shared unit tests in `packages/shared/src/index.test.ts` (AC: 5)
  - [x] `isValidTag`: 32 characters accepted, 33 rejected, inner space and tab rejected, surrounding whitespace accepted, blank per open question 1.
  - [x] `normalizeTags`: trimming, lower-casing, duplicate folding across case and whitespace, order kept, input not mutated, `[]` in gives `[]` out.
- [x] API store and route (AC: 1, 2, 3)
  - [x] `packages/api/src/store.ts` `add()`: when `input.tags` is given, throw `ValidationError("invalid tag")` if any tag fails `isValidTag` (and for malformed input per open question 2), else store `normalizeTags(input.tags)`; default `[]`. Validate before inserting, so a rejected request stores nothing.
  - [x] `packages/api/src/app.ts` POST handler: read `tags` from the body and pass it to `store.add` without coercing it, so the store can reject malformed values.
- [x] API tests in `packages/api/src/app.test.ts` (AC: 5)
  - [x] POST with `tags: [" News ", "news", "TECH"]` answers 201 with `tags: ["news", "tech"]`, and GET returns the same tags on that bookmark.
  - [x] POST without `tags` answers 201 with `tags: []`.
  - [x] POST with a 33-character tag and with `"two words"` each answer 400 `{"error":"invalid tag"}`, and GET shows no new bookmark.
  - [x] Malformed and blank tags per open questions 1 and 2.
- [x] Web rendering in `packages/web/src/render.ts` (AC: 4)
  - [x] After the title link, append an element (for example `<span class="tags">`) whose text is `bookmark.tags.join(", ")`, only when `bookmark.tags.length > 0`.
- [x] Web tests in `packages/web/src/render.test.ts` (AC: 5)
  - [x] Add `tags` to the existing fixtures so they type-check.
  - [x] A bookmark with `["news", "tech"]` shows `news, tech` after its title; a bookmark with `[]` renders no tags element and its item text is only the title and `Remove`.
- [x] Delivery conventions (AC: 6)
  - [x] Add a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with summary `Add tags to bookmarks`.
  - [x] Run `pnpm build` then `pnpm measure`, and update `web_bundle_gzip_bytes` in `measure/baseline.json` to the printed value when it differs from 835.
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.

## Engineering Context

- Workspace: pnpm, ESM, TypeScript; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `api` and `web`. Relative imports use the `.js` suffix.
- `packages/shared/src/index.ts` holds `Bookmark`, `NewBookmark`, and the pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag helpers belong here, per `AGENTS.md` ("types and pure functions").
- `packages/api/src/store.ts` `BookmarkStore.add()` validates title, then URL, then URL uniqueness, and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }` and a JSON `SyntaxError` to 400 `{"error":"invalid json"}`. Throwing `ValidationError("invalid tag")` gives the exact body AC 2 requires with no route change beyond passing `tags` through.
- The store is in memory (`Map`), so there is no persisted data and no migration: every bookmark is created with `tags`.
- `packages/web/src/render.ts` `renderList()` builds `<li><a>title</a><button>Remove</button></li>`; `index.html` styles `li` as flex with `space-between`, so the tags element sits between the title and the button. Use `textContent`, not HTML, for the tag text.
- `packages/web/src/main.ts` passes `GET /bookmarks` results straight to `renderList`; it needs no change unless open question 5 brings a tags input into scope (then `index.html` form and `main.ts` submit handler change too).
- Web tests run in jsdom (`packages/web/vite.config.ts`).
- Engineering choice: validate tags after the URL checks and before inserting, so a request with both a bad URL and a bad tag reports the URL error, as today.

## Testing Strategy

- Unit (shared): `isValidTag` and `normalizeTags` happy, boundary (32 vs 33), whitespace, case, duplicate, blank, and immutability cases. Run `pnpm --filter @sample/shared test`.
- Integration (api): `app.test.ts` drives the real `http` server with `fetch`: tags round-trip through POST and GET, default `[]`, each 400 case with the exact body, and no bookmark stored on rejection. Run `pnpm --filter @sample/api test`.
- Unit (web, jsdom): rendering with tags, without tags, and the existing Remove wiring. Run `pnpm --filter @sample/web test`.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; CI's `test`, `lint`, and `typecheck` jobs run the same on the pull request.
- Bundle size: `pnpm build` then `pnpm measure`; CI's `measure` job reports the delta against `measure/baseline.json`.
- No manual or live-app check: the issue asks for unit tests only.

## Operational Requirements

- Merging into `main` needs the required status check `test` to pass — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test` (integration 15368); owner: repository admin (`panz3r`).
- Merging into `main` needs one approving review and a squash merge — where: repository ruleset `main` (id 26033321); evidence: the same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). `TEAMS.md` names `duckyduff369` (QA Engineer) as the approver.
- This change adds, removes, and renames no CI check contexts; the `test` job in `.github/workflows/ci.yml` runs on `pull_request`.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts

- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts

- packages/web/src/render.ts
- packages/web/src/render.test.ts

- .changeset/add-tags-to-bookmarks.md
- measure/baseline.json
- _plans/fiji-work-items/FIJIH-48.md

## Implementation Record

Task 1 and 2 — shared tag types, `isValidTag` (trimmed, non-blank, <= 32 chars, no whitespace) and `normalizeTags` (trim, lower-case, de-duplicate in first-occurrence order), with unit tests for 32/33 boundary, inner space/tab, trimming, blank, case and duplicate folding, order, immutability, and `[]`.
(commit 448d349)

Task 3 and 4 — `BookmarkStore.add()` validates `tags` after the URL checks and before inserting (non-array, non-string element, blank, over 32 characters, or inner whitespace throw `ValidationError("invalid tag")`), stores `normalizeTags(tags)`, defaults to `[]`; the POST handler passes `body.tags` through uncoerced. API tests drive the real server for round-trip, default, 32-character acceptance, and five 400 cases that store nothing.
(commit 31f1e27)

Task 5 and 6 — `renderList` appends `<span class="tags">` with `tags.join(", ")` textContent between the title link and Remove, only when the bookmark has tags; existing fixtures gained `tags: []`; new tests cover the tags text and position and the no-tags item text (`ExampleRemove`).
(commit 1b4bb87)

Task 7 — added the changeset (`@sample/shared`, `@sample/api`, `@sample/web` minor, summary `Add tags to bookmarks`); `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881` (delta 46), so `measure/baseline.json` moved from 835 to 881. Root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass.
(commit 6aefb64)

## Validation Evidence

- AC-1: passed — api app.test.ts (normalise/dedupe round trip, default `[]`) and shared normalizeTags tests; `pnpm test` passes.
- AC-2: passed — shared isValidTag tests (32 accepted, 33 rejected, inner whitespace, blank) and API tests answering 400 `{"error":"invalid tag"}` with nothing stored.
- AC-3: passed — API tests check GET /bookmarks returns `tags` (normalised and `[]`).
- AC-4: passed — web render.test.ts: `news, tech` after the title; no `.tags` element and item text `ExampleRemove` without tags.
- AC-5: passed — tests added in shared (11 total), api (11 total), web (4 total).
- AC-6: passed — `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root pass; changeset `.changeset/add-tags-to-bookmarks.md` added; `pnpm build` then `pnpm measure` printed 881 and `measure/baseline.json` holds 881.

## Quality Gate

Gate: concerns — every criterion is evidenced and every required validation passes; two minor findings remain as follow-up.

Reviewed head: 6aefb64b332a0ff1ec79b5f78048a9d3f210cfdc

Validations re-run at the reviewed head: `pnpm test` (shared 11, api 11, web 4 tests pass), `pnpm lint`, and `pnpm typecheck` pass; `pnpm build` then `pnpm measure` prints `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0`.

Acceptance trace:

- AC-1: implementation `packages/shared/src/index.ts` `normalizeTags` (trim, lower-case, `Set` keeps first occurrence); `packages/api/src/store.ts` `add()` stores `normalizeTags(rawTags)` with `input.tags ?? []`; `packages/api/src/app.ts` passes `body.tags` through and returns the stored bookmark with 201. Verification: `app.test.ts` "normalises tags on create and returns them from GET" and "defaults tags to an empty array"; `index.test.ts` `normalizeTags` cases. Met.
- AC-2: implementation `isValidTag` (trimmed, non-blank, at most 32, no `/\s/`) and the `store.add()` check that throws `ValidationError("invalid tag")` before `items.set`, which `app.ts` maps to 400 `{"error":"invalid tag"}`. Verification: `index.test.ts` `isValidTag` (32 accepted, 33 rejected, space and tab, trimmed, blank); `app.test.ts` "accepts a 32-character tag" and the five "rejects … and stores nothing" cases (33 characters, inner whitespace, blank, non-string element, non-array string). Met, with finding 1 for `tags: null`.
- AC-3: implementation `Bookmark.tags: string[]` and every stored bookmark gets `tags`; `GET /bookmarks` returns `store.list()`. Verification: `app.test.ts` GET checks for `["news", "tech"]` and `[]`. Met.
- AC-4: implementation `packages/web/src/render.ts` appends `<span class="tags">` with `textContent = tags.join(", ")` between the link and Remove, only when `tags.length > 0`. Verification: `render.test.ts` "shows tags after the title, comma separated" (text `news, tech`, position after the `A`) and "renders no tags element for a bookmark without tags" (`.tags` absent, item text `ExampleRemove`). Met.
- AC-5: tests added in `packages/shared/src/index.test.ts`, `packages/api/src/app.test.ts`, and `packages/web/src/render.test.ts` cover the 32/33 boundary, inner whitespace, case and duplicate folding, the omitted-`tags` default, and no-tags rendering. Met.
- AC-6: root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass at the reviewed head; `.changeset/add-tags-to-bookmarks.md` bumps `@sample/shared`, `@sample/api`, `@sample/web` with summary `Add tags to bookmarks`; `measure/baseline.json` holds 881, which `pnpm build` then `pnpm measure` prints. Met.

Findings:

1. minor — `packages/api/src/store.ts` (`const rawTags: unknown = input.tags ?? [];`): `POST /bookmarks` with `"tags": null` answers 201 and stores `tags: []`, while the approved plan-approval answer 2 says a non-array `tags` value answers 400. Reproduced against the real server at the reviewed head: `{"url":"https://a.example.com","title":"T","tags":null}` → `201 {…,"tags":[]}`. No test covers `null`. Treating JSON `null` as omitted is defensible; the user decides whether to keep it or require 400.
2. minor — `packages/shared/src/index.ts` (`isValidTag` / `normalizeTags`): the length rule is checked before lower-casing, and `toLowerCase()` can lengthen a string, so a stored tag can be longer than 32 characters. Reproduced: `isValidTag("İ".repeat(32))` is `true` and `normalizeTags(["İ".repeat(32)])[0].length` is 64. This matches AC-2 and open question 3 as written (the rule applies to the trimmed input). It is noted for any later consumer that assumes stored tags are at most 32 characters.

Residual risks: none. The Operational Requirements entries carry evidence; no Validation Evidence line is `deferred` or `pending-ci`.

## Review Record

Copilot pass (PR #9, draft): review 5700260343 by copilot-pull-request-reviewer[bot], COMMENTED at 2026-10-29T15:21:31Z on head d6b9082. No review threads, no inline comments, "Approval recommended - No open issues". No findings to classify; no fix commits, no replies, no threads to resolve, no re-review requested. The recorded minor follow-ups (null tags accepted as omitted; tag length validated before lower-casing) were not raised.

Jira handoff draft:

```
FIJI-CONTEXT:FIJIH-48:fiji/orchestrate-development/v1

FIJIH-48 "Add tags to bookmarks" is implemented and in review: https://github.com/panz3r/fijih-sample/pull/9 (base main, ready for review).

Outcome: POST /bookmarks accepts an optional "tags" array (each tag trimmed, lower-cased, deduplicated in first-occurrence order; default []); a tag over 32 characters after trimming, or containing whitespace, a blank tag, or a non-string tag answers 400 {"error":"invalid tag"} and stores nothing. GET /bookmarks returns tags on every bookmark. The web page shows tags after the title, comma separated, and nothing when there are none. Added changeset .changeset/add-tags-to-bookmarks.md; measure/baseline.json moved from 835 to 881 (web_bundle_gzip_bytes).

Validation: pnpm test, pnpm lint, and pnpm typecheck pass from the repository root; unit tests added in packages/shared, packages/api, and packages/web. CI on pull request head d6b9082 (run 40900453960): test, lint, typecheck, measure, scenarios all succeeded. Review: Copilot review raised no findings; the QA Engineer duckyduff369 APPROVED on d6b9082 ("Looks good."); no review threads open.

Decisions recorded at plan approval: a blank tag after trimming answers 400; a non-array or non-string tags value answers 400; length and whitespace rules apply to the trimmed tag; tags keep first-occurrence order; no tags input on the web add form (tags are set through the API only); README.md left unchanged. Tags are not filterable and cannot be edited on an existing bookmark (out of scope per the issue).

Follow-ups kept by the user (Quality Gate: concerns, two minor findings, neither fixed):
1. POST /bookmarks with "tags": null is treated as omitted (201, tags: []) rather than 400; no test covers null.
2. The 32-character length check runs before lower-casing, and toLowerCase() can lengthen a string, so a stored tag can exceed 32 characters (for example, 32 repetitions of "İ" is accepted and stored as 64 characters). Matches AC-2 as written; relevant to any later consumer that assumes stored tags are at most 32 characters.

Operational: merging into main needs the required status check "test" and one approving review with a squash merge (repository ruleset main, id 26033321); this change adds, removes, and renames no CI check contexts.
```

## Change Log

- 2026-10-29: Drafted from Jira FIJIH-48 revision `2026-10-29T16:12:10.397+0100` (issue assigned to the current user before reading the revision). Six open product questions recorded in Product Context for `plan-approval`.
- 2026-10-29: Approved: plan-approval — Approve. Answers: 1 yes, a blank tag after trimming answers 400 invalid tag; 2 yes, a non-array or non-string tags value answers 400; 3 yes, the rules apply to the trimmed tag; 4 yes, keep first-occurrence order; 5 no tags input on the add form; 6 leave README.md unchanged.
- 2026-10-29: Implemented shared tag helpers and tests (tasks 1-2).
- 2026-10-29: Implemented API tag validation, storage, and tests (tasks 3-4).
- 2026-10-29: Implemented web tag rendering and tests (tasks 5-6).
- 2026-10-29: Delivery conventions done (task 7); all tasks checked; checkpoint implementation-approval.
- 2026-10-29: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-29: Finalize: every task and acceptance criterion has committed evidence on the branch; added `(commit <hash>)` lines to the four Implementation Record entries (tasks 1-2 448d349, 3-4 31f1e27, 5-6 1b4bb87, 7 6aefb64). Recorded quality gate concerns with two minor findings as follow-ups; checkpoint local-qa-review.
- 2026-10-29: Approved: local-qa-review — Approve. Keep both minor findings as recorded follow-ups.
- 2026-10-29: Delivery: pushed `FIJIH-48-add-tags-to-bookmarks` at d6b9082; opened draft pull request #9 (base main, label enhancement, assignee panz3r) with Copilot review requested; no human reviewer requested until ready-for-review. Change intent already present (`.changeset/add-tags-to-bookmarks.md`).
- 2026-10-29: Copilot pass: review 5700260343 raised no findings on d6b9082; transition ready-for-review, checkpoint ready-for-review.
- 2026-10-29: Approved: ready-for-review — Approve.
- 2026-10-29: Ready-for-review: marked pull request #9 ready for review and requested review from `duckyduff369` (QA Engineer, owning team in TEAMS.md; the only other team member, `panz3r`, is the author). Transition review-requested; held locally with the earlier work-item-only commits.
- 2026-10-29: Jira handoff draft: wrote the Jira handoff draft comment (outcome, validation, review state, plan-approval decisions, two kept follow-ups, operational notes) in the Review Record; PR #9 head d6b9082 shows approval by `duckyduff369` (review 5700305678) and no open findings. Transition handoff-drafted, checkpoint jira-handoff; held locally with the earlier work-item-only commits.
