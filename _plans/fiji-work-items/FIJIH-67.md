---
schema: fiji/work-item/v1
id: FIJIH-67
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-67
  revision: "2026-10-30T21:06:55.500+0100"
lifecycle:
  status: active
  phase: remote-review
  checkpoint: null
  transition: review-requested
  attempt: 1
quality:
  gate: pass
artifacts:
  branch: FIJIH-67-add-tags-to-bookmarks
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/16
  jira_context_comment_id: null
---

# Work Item FIJIH-67: Add tags to bookmarks

## Story

As a bookmarks user,
I want to attach an optional list of tags to a bookmark,
so that I can group my bookmarks.

## Product Context

Source: Jira FIJIH-67 (Story, "Add tags to bookmarks"), no comments, no attachments, no Figma link.

Jira acceptance criteria, verbatim:

- POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
- GET /bookmarks returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.

Jira decisions: tags are not filterable yet.

Out of scope (per the Jira issue's "Out of scope" section):

- Filtering or searching by tag.
- Editing tags of an existing bookmark.

Open product questions (also under the Plan result's `risks`; the criteria below follow the proposed answer until the user decides):

1. Whether a tags input in the web page's add form (`packages/web/index.html`, `packages/web/src/main.ts`) is in scope. The issue only asks the page to show tags. Proposed: out of scope, so tags can be set only through the API for now.
2. A tag that is empty after trimming (`""`, `"   "`): proposed 400 `{"error":"invalid tag"}`.
3. A `tags` value that is not an array, or an element that is not a string: proposed 400 `{"error":"invalid tag"}`.
4. Order of the stored tags: proposed input order, keeping the first occurrence of a duplicate (no sorting).
5. Interpretation of the limits: proposed that they apply to the normalized tag (trimmed and lower-cased), so `"  News "` is valid and becomes `"news"`; "containing whitespace" means any whitespace left inside the trimmed tag; "characters" counts Unicode code points; exactly 32 characters is valid.
6. Display separator: proposed `", "` (comma and space), for example `Example news, tech`.

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings answers 201 with the created bookmark, whose `tags` holds each tag trimmed and lower-cased, with duplicates (after normalization) removed, in input order keeping first occurrences. For example `["  News", "news", "Tech"]` is stored as `["news", "tech"]`.
2. `POST /bookmarks` without `tags` answers 201 with `tags: []`.
3. `POST /bookmarks` answers 400 with `{"error":"invalid tag"}` and stores nothing when any tag, after normalization, is longer than 32 characters, contains whitespace, or is empty, or when `tags` is not an array of strings. A 32-character tag is accepted.
4. `GET /bookmarks` returns each bookmark with its `tags` array.
5. The web page shows, for each bookmark with tags, its tags after its title, joined with `", "`, and shows no tags text or element for a bookmark with no tags.
6. Vitest tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–5, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. The change adds a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` whose summary is `Add tags to bookmarks`, and `measure/baseline.json` holds the `web_bundle_gzip_bytes` value that `pnpm build` then `pnpm measure` reports on the branch.

## Tasks and Subtasks

- [x] Shared: add tag support to `packages/shared/src/index.ts` (AC: 1, 2, 3, 4)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags` to `NewBookmark`.
  - [x] Add a pure tag normalizer and validator (trim, lower-case, reject empty, whitespace, and over-32-code-point tags, deduplicate keeping first occurrences), with an exported 32-character limit constant.
  - [x] Unit tests in `packages/shared/src/index.test.ts` for normalization, deduplication order, the 32/33 boundary, inner whitespace, empty after trim, and the empty default.
- [x] API: accept, validate, store, and return tags (AC: 1, 2, 3, 4)
  - [x] `packages/api/src/store.ts`: `add` normalizes `input.tags` (default `[]`), throws `ValidationError("invalid tag")` on an invalid tag or a non-array or non-string value, and stores `tags` on the bookmark.
  - [x] `packages/api/src/app.ts`: pass `body.tags` from the POST body to `store.add`.
  - [x] Tests in `packages/api/src/app.test.ts` (POST with tags, POST without tags, each 400 case, GET returns tags) and `packages/api/src/store.test.ts` (an invalid tag stores nothing).
- [x] Web: render tags after the title (AC: 5)
  - [x] `packages/web/src/render.ts`: after the title link, append an element whose text is `tags.join(", ")`, only when the bookmark has tags; set text with `textContent`.
  - [x] Keep the title and tags together on the left so the Remove button stays right-aligned (the `li` uses `justify-content: space-between` in `packages/web/index.html`).
  - [x] Tests in `packages/web/src/render.test.ts`: tags shown after the title with `", "`; no tags element or text when `tags` is empty; existing fixtures gain `tags`.
- [x] Run the root checks `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 6)
- [x] Add the changeset `.changeset/fijih-67-add-tags-to-bookmarks.md` (minor bump for `@sample/shared`, `@sample/api`, `@sample/web`; summary `Add tags to bookmarks`) (AC: 7)
- [x] Run `pnpm build` then `pnpm measure`, and update `measure/baseline.json` `web_bundle_gzip_bytes` to the reported value (AC: 7)

## Engineering Context

- Workspace: `packages/shared` (types, pure functions; imported from source by the others), `packages/api` (Node `http` server in `app.ts`, in-memory `BookmarkStore` in `store.ts`), `packages/web` (Vite page; `render.ts` builds the list, `main.ts` fetches and wires the form).
- Validation errors travel as `ValidationError(message)` from the store and become `400 {"error": message}` in `app.ts`; the new error uses the message `invalid tag`.
- Storage is in memory only: no migration. `Bookmark.tags` becomes required, so typed fixtures (for example in `packages/web/src/render.test.ts`) need `tags`.
- Validation order in `store.add`: title, then URL, then tags, then the duplicate-URL check, so a request with both an invalid URL and an invalid tag keeps answering the URL error.
- Lower-casing uses `String.prototype.toLowerCase()`; whitespace means a `\s` match; length counts code points (`[...tag].length`) of the normalized tag.
- `main.ts` needs no change unless open question 1 brings the add-form input into scope.
- No new dependencies.
- A remote branch `FIJIH-66-add-tags-to-bookmarks` (pull request #15, closed unmerged) holds an earlier, different take on this feature for another Jira issue. This work item is drafted from `main` and does not reuse it.
- Out of scope per the Jira issue: tag filtering or search, editing tags of an existing bookmark.

## Testing Strategy

- Unit (Vitest), per `AGENTS.md` ("Every behaviour change comes with a Vitest test in the package it changes"):
  - `packages/shared`: happy path (trim, lower-case, dedupe in order, empty default) and unhappy paths (33 code points, inner whitespace, empty after trim).
  - `packages/api`: HTTP integration tests in `app.test.ts` against a server on a random port, covering 201 with normalized tags, 201 with `tags: []` when omitted, 400 `invalid tag` for each invalid case including a non-array and a non-string element, and `GET /bookmarks` returning tags; store test that a rejected add leaves the list unchanged.
  - `packages/web`: DOM tests in `render.test.ts` for the tags text after the title and for no tags output when empty.
- Checks from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (per-package variants in `AGENTS.md`).
- Bundle size: `pnpm build` then `pnpm measure`; the change updates `measure/baseline.json` since rendering tags moves the web bundle. The CI `measure` job reports the same value and never fails.
- No manual or end-to-end check is planned: the issue asks for unit tests, and the project has no end-to-end convention.

## Operational Requirements

- The required status check `test` (GitHub Actions, integration 15368) must pass before merging into `main`; the `ci` workflow's `test` job runs on `pull_request`, and this change adds, removes, or renames no check context — where: repository ruleset `main` (id 26033321, target `~DEFAULT_BRANCH`, active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks: [{context: "test", integration_id: 15368}]`, and `.github/workflows/ci.yml` defines job `test` on `pull_request`; owner: repository administrators of `panz3r/fijih-sample` (`panz3r`).
- One approving review is required and only squash merges are allowed into `main` — where: repository ruleset `main` (id 26033321); evidence: same call returned `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository administrators of `panz3r/fijih-sample` (`panz3r`). Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection applies — where: `main` branch protection; evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected"; owner: repository administrators (`panz3r`).

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/api/src/store.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- .changeset/fijih-67-add-tags-to-bookmarks.md
- measure/baseline.json

## Implementation Record

Task 1 — shared tag support: `Bookmark.tags`, optional `NewBookmark.tags` (typed `unknown` so the store can reject non-arrays), `MAX_TAG_LENGTH`, and `normalizeTags` (returns null on invalid input).
(commit 9cccebe)

Task 2 — API tags: `store.add` validates tags after the URL check (before the duplicate check) via `normalizeTags`, throwing `ValidationError("invalid tag")`; `app.ts` passes `body.tags`; HTTP and store tests added.
(commit 70f1b4d)

Task 3 — web tags: `render.ts` wraps the title link and a `span.tags` (text ` news, tech`, built with `textContent`, omitted when empty) in a `span` so the Remove button stays right-aligned; no change to `index.html` needed. Existing fixtures gained `tags`.
(commit ba6c619)

Task 4 — root checks (checked at ba6c619): `pnpm test`, `pnpm lint`, `pnpm typecheck` all pass from the repository root.

Task 5 — changeset `.changeset/fijih-67-add-tags-to-bookmarks.md` (minor for shared, api, web; summary `Add tags to bookmarks`).
(commit 8860c4e)

Task 6 — `pnpm build` then `pnpm measure` reported `web_bundle_gzip_bytes=895` (delta 60 from 835); `measure/baseline.json` updated to 895.
(commit abc61e2)

Stale-statement sweep — `NewBookmark`, `Bookmark` shape, `POST /bookmarks`, `invalid tag`, `web_bundle_gzip_bytes`, list item markup

none found (README.md, AGENTS.md, scenarios/ and code comments checked with `git grep`; scenario notes are historical records).

## Validation Evidence

- AC-1: passed — API test `stores normalized tags` (`["  News","news","Tech"]` -> `["news","tech"]`) and shared tests.
- AC-2: passed — API test `defaults tags to an empty array`.
- AC-3: passed — API tests for 33 chars, inner whitespace, empty, non-array, non-string (400 `invalid tag`, nothing stored); 32-char accepted.
- AC-6: passed — root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass.
- AC-7: passed — changeset present; `pnpm measure` reports 895 and `measure/baseline.json` holds 895.
- AC-5: passed — web tests: tags after the title joined with `, `; no `.tags` element when empty.
- AC-4: passed — API test GET returns tags.

## Quality Gate

Gate: pass

Scope: full review of the branch diff `main` (c9c9454)..a7e6813 (implementation commits 35aa496..a7e6813; product changes in 9cccebe, 70f1b4d, ba6c619, 8860c4e changeset, abc61e2 baseline).

Acceptance trace:
- AC-1: implementation `normalizeTags` trims, lower-cases, and dedupes through an insertion-ordered `Set` (packages/shared/src/index.ts:48-59); `store.add` stores the normalized tags (packages/api/src/store.ts:17-23); `app.ts` passes `body.tags` (packages/api/src/app.ts:23-24). Verification: shared index.test.ts (`["  News","news","Tech"]` -> `["news","tech"]`, `["b","a","B"]` -> `["b","a"]`); store.test.ts (`[" X ","x"]` -> `["x"]`); app.test.ts 201 body `["news","tech"]`. Probe at the reviewed head: `["NEWS","news","News"]` -> `["news"]`, `[" news "]` -> `["news"]`. Evidenced.
- AC-2: implementation `normalizeTags(undefined)` -> `[]` (index.ts:49). Verification: shared `defaults to an empty array`; app.test.ts `defaults tags to an empty array` (201, `tags: []`). Evidenced.
- AC-3: implementation `normalizeTags` returns null for a non-array, a non-string element, an empty normalized tag, a `\s` match, or more than `MAX_TAG_LENGTH` (32) code points (index.ts:50-56); `store.add` throws `ValidationError("invalid tag")` after the title and URL checks and before the duplicate check and insert (store.ts:17-18), mapped to 400 by app.ts:30. Verification: shared boundary tests (32/33 ASCII and emoji, space, tab, `""`, `"   "`, `["ok",1]`, `"news"`, `null`); app.test.ts 400 `{"error":"invalid tag"}` with the bookmark absent from GET for too long, inner whitespace, empty after trim, empty, not an array, non-string element; 32-character tag 201; store.test.ts invalid tag stores nothing. Probe: `{}` -> null, `["a b"]` -> null. Evidenced.
- AC-4: implementation tags live on the stored `Bookmark` returned by `store.list()`. Verification: app.test.ts `stores normalized tags and returns them from GET` (GET entry `TagsOk` has `["news","tech"]`). Evidenced.
- AC-5: implementation `renderList` wraps the link and, only when `tags.length > 0`, a `span.tags` whose `textContent` is ` ${tags.join(", ")}` (packages/web/src/render.ts:18-25), keeping title and tags in one flex child so Remove stays right-aligned. Verification: render.test.ts `li` text `Example news, techRemove`, `.tags` text `news, tech`; no `.tags` and text `ExampleRemove` when empty. Evidenced.
- AC-6: Vitest tests added in all three packages covering AC 1-5. Re-run at the reviewed head: `pnpm test` (shared 8, api 14, web 4 passed), `pnpm lint` exit 0, `pnpm typecheck` exit 0. Evidenced.
- AC-7: `.changeset/fijih-67-add-tags-to-bookmarks.md` bumps `@sample/shared`, `@sample/api`, `@sample/web` minor with summary `Add tags to bookmarks`; re-run `pnpm build` exit 0 then `pnpm measure` `web_bundle_gzip_bytes=895`, delta 0 against `measure/baseline.json` (895). Evidenced.

Findings: none.

Residual risks: none. No Operational Requirements entry is `evidence: unverified`; no Validation Evidence line is `deferred` or `pending-ci`.

Product decisions vs. acceptance criteria: the approved answers to questions 1-6 (no form input; empty or non-string tags 400; input order, first duplicate wins; limits on the trimmed, lower-cased tag in code points, 32 valid; `", "` separator) match AC 1, 3, and 5. No contradiction. Out-of-scope items (filtering, editing tags) untouched.

Adversarial notes (no finding): tags are rendered with `textContent` (no HTML injection); limits apply to the lower-cased tag per decision 5, so `"İ".repeat(17)` (34 code points after lower-casing) is rejected and `"İ".repeat(16)` accepted; zero-width characters such as U+200B are not `\s` and are accepted, consistent with the Engineering Context definition of whitespace; validation order keeps the URL error ahead of the tag error as planned; no new dependencies.

Stale-statement sweep (names and behaviours changed: `Bookmark`/`NewBookmark` shape, `normalizeTags`, `MAX_TAG_LENGTH`, `POST /bookmarks` and `GET /bookmarks` bodies, `invalid tag`, list item markup, `web_bundle_gzip_bytes`; searched README.md, AGENTS.md, `*.md` outside `_plans/`, `scripts/`, `.github/workflows/`, and code comments and test descriptions under `packages/`): none found. README.md's `packages/shared` row lists its functions in parentheses without tags; it remains true. Scenario notes describe Jira seed text and are not made untrue.

Reviewed head: a7e6813d7d9d04e2b9db7bbc6e7c9c8db1571093

## Review Record

Copilot pass (automated-review), review 5718172559 on 349dc69; re-review 5718227842 at f531ddd: approval recommended, no open issues.

- Thread PRRT_kwDOVaYq_M6yISKY (`_plans/fiji-work-items/FIJIH-67.md`, duplicate `checkpoint` key in frontmatter): `valid` at 349dc69; already fixed by f531ddd (single `checkpoint` key), pushed. Reply https://github.com/panz3r/fijih-sample/pull/16#discussion_r4428124501; resolved. No new fix commit, no code change.
- CI: `ci` run 41121686683 on 349dc69 and run 41122548611 on f531ddd (only the work-item file differs) both succeeded.

## Change Log

- Drafted from Jira FIJIH-67 at revision 2026-10-30T21:06:55.500+0100 (after assigning the issue to Mattia Panzeri), base `main` at c9c9454.
- Approved: plan-approval — Approve with the proposed answers to questions 1-6 (no tags input on the form; empty or non-string tags get 400 invalid tag; keep input order, first duplicate wins; limits on the trimmed lower-cased tag in code points, 32 valid; join with ", "). Noted item 7, no action.
- Task 1 (shared) done: `pnpm --filter @sample/shared test` 8 passed; shared typecheck and lint pass.
- Task 2 (API) done: `pnpm --filter @sample/api test` 14 passed; API typecheck and lint pass.
- Task 3 (web) done: `pnpm --filter @sample/web test` 4 passed; web typecheck and lint pass.
- Stale-statement sweep: none found. Implementation complete; Jira FIJIH-67 moved To Do -> In Progress.
- Approved: implementation-approval — automatic (no risk triggers)
- Finalize (Local QA review): added `(commit <hash>)` citations to the Implementation Record entries for Tasks 1, 2, 3, 5, and 6, each matched to the commit that added it; Task 4 keeps its existing `(checked at ba6c619)` citation. All seven acceptance criteria have Validation Evidence lines and committed evidence; no task or evidence discrepancies. Set checkpoint `local-qa-review`.
- Approved: local-qa-review — Approve.
- Delivery: existing changeset `.changeset/fijih-67-add-tags-to-bookmarks.md` already holds the release entry (no new change intent commit); pushed `FIJIH-67-add-tags-to-bookmarks` and opened draft pull request #16 (`[FIJIH-67] Add tags to bookmarks`, label `enhancement`, base `main`), with Copilot review requested.
- Copilot findings pass: 1 finding (duplicate frontmatter key) fixed by f531ddd and resolved; Copilot re-review clear. Set checkpoint `ready-for-review`.
- Approved: ready-for-review — Approve.
- Ready for review: marked pull request #16 ready and requested review from `duckyduff369` (QA Engineer, the only other member of the owning team; the author is excluded). Set phase `remote-review`, transition `review-requested`.
