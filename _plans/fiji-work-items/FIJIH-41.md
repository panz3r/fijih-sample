---
schema: fiji/work-item/v1
id: FIJIH-41
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-41
  revision: "2026-10-28T18:30:03.635+0100"
lifecycle:
  status: active
  phase: remote-review
  checkpoint: null
  transition: handoff-recorded
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-41-add-bookmark-tags
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/4
  jira_context_comment_id: "10003"
---

# Work Item FIJIH-41: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want each bookmark to carry an optional list of tags that the API accepts and returns and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-41 "Add tags to bookmarks" (Story, Medium, label `scenario-S1`), revision `2026-10-28T18:30:03.635+0100`. No comments, attachments, links, or Figma references.
- Issue context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue decisions: tags are not filterable yet.
- Issue out of scope: filtering or searching by tag; editing tags of an existing bookmark.
- User decisions (answers to the earlier Plan block, verbatim):
  1. Web add form: "no tags input on the add form in this story". The add form in `packages/web/index.html` and the request body in `packages/web/src/main.ts` stay unchanged.
  2. Malformed tags: "a non-array tags value or a non-string entry answers 400 {"error":"invalid tag"}".
  3. Empty tags: "a tag that is empty after trimming is rejected with 400 {"error":"invalid tag"}".
- Out of scope, per the issue: tag filtering or search, and editing tags on an existing bookmark (there is no update endpoint). Per user decision 1: a tags input on the add form.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field. When it is absent, the created bookmark has `tags: []`. When it is an array of strings, the API trims and lower-cases each tag, then removes duplicates (keeping the first occurrence, in input order). The 201 response body includes the resulting `tags`. Example: `["  News ", "news", "Tech"]` is stored as `["news", "tech"]`.
2. `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores no bookmark when any of these is true:
   - `tags` is present but is not an array. This includes `null`, a string, a number, and an object.
   - Any entry is not a string.
   - Any tag is empty after trimming.
   - Any tag is longer than 32 characters after trimming.
   - Any tag contains whitespace after trimming.

   A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns a `tags` array on every bookmark: the normalized tags from creation, or `[]`.
4. The web page shows each bookmark's tags after its title as one comma-separated text (`news, tech`). For a bookmark with no tags it renders no tag text and no tag element.
5. Vitest unit tests cover the new behaviour in each package:
   - `packages/shared`: normalization and validation.
   - `packages/api`: the POST and GET tags behaviour, including every 400 case in AC 2.
   - `packages/web`: tags rendered and tags absent.
6. The change follows the repository's release conventions:
   - A changeset in `.changeset/` names the changed packages, with the summary "Add tags to bookmarks".
   - `measure/baseline.json` holds the `web_bundle_gzip_bytes` that `pnpm build && pnpm measure` prints on the branch.
   - `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] `packages/shared`: add tags to the model, plus a pure normalize-and-validate helper (AC: 1, 2, 5)
  - [x] Add `tags: string[]` to `Bookmark`. Let `NewBookmark` take optional `tags?: unknown` input, or add an equivalent input type.
  - [x] Add a helper, such as `normalizeTags(value: unknown): string[] | null`. It returns `[]` for `undefined` and the trimmed, lower-cased, de-duplicated list (first occurrence kept) for a valid array. For every invalid case in AC 2 it signals failure.
  - [x] Add tests in `packages/shared/src/index.test.ts`:
    - absent input gives `[]`
    - trim, lower-case, and dedupe, with order kept
    - a tag of exactly 32 characters is accepted and one of 33 is rejected
    - a tag with inner whitespace is rejected
    - a tag that is empty after trimming is rejected
    - a non-array value (including `null`) is rejected
    - a non-string entry is rejected
- [x] `packages/api`: accept, validate, store, and return tags (AC: 1, 2, 3, 5)
  - [x] In `app.ts`, pass `body.tags` through to `store.add` unchanged. Do not coerce it.
  - [x] In `store.ts`, call the shared helper and throw `ValidationError("invalid tag")` on failure, before checking for a duplicate URL and before storing. Store the normalized `tags` on the bookmark.
  - [x] Add tests in `packages/api/src/app.test.ts`:
    - without `tags`, POST gives `tags: []` in both the 201 response and the GET response
    - with tags, POST normalizes them, and GET returns them
    - each 400 case in AC 2 answers `{"error":"invalid tag"}` and adds nothing to `GET /bookmarks`
- [x] `packages/web`: render tags after the title (AC: 4, 5)
  - [x] In `render.ts`, after the link, append an element (for example `<span class="tags">`) whose text is `tags.join(", ")`. Append it only when `tags.length > 0`.
  - [x] Update the existing fixtures in `render.test.ts` for the new required `tags` field. Add tests for a bookmark with tags (text `news, tech`, placed after the title link) and for a bookmark with no tags (no tag element, and the item text has no tag text).
  - [x] Leave the add form (`index.html`) and the POST body in `main.ts` unchanged (user decision 1).
- [x] Release conventions (AC: 6)
  - [x] Run `pnpm build`, then `pnpm measure`. When `web_bundle_gzip_delta` is not 0, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in the same change.
  - [x] Add a changeset (`pnpm changeset`) for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary "Add tags to bookmarks".
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root, and record the results.

## Engineering Context

- Workspace: pnpm. `@sample/shared` holds types and pure functions, and the `api` and `web` packages import it from source. Tests use Vitest in each package. The web tests run against a DOM (`render.test.ts` uses `document`).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark`, and the URL helpers.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates input and throws `ValidationError`, which `app.ts` maps to `400 {"error": message}`.
  - `packages/api/src/app.ts`: parses the POST body.
  - `packages/web/src/render.ts`: `renderList`.
- The store keeps bookmarks in memory only, so there is no persisted data to migrate. Every bookmark created after this change has `tags`.
- Validation order in `store.add`:
  - Title and URL keep their current checks and messages.
  - The tag check runs before the duplicate-URL check, so a request with invalid tags never stores a bookmark.
  - A request that has both an invalid title or URL and invalid tags answers with the first failing check. The tests send otherwise-valid bodies.
- Normalization order: trim, then validate (not empty, at most 32 characters, no whitespace matching `/\s/`), then lower-case, then dedupe. Lower-casing does not change the length of ASCII tags, so the length check gives the same result before or after lower-casing for the cases tested.
- Planning choices made within the criteria (not product decisions; they can be changed at plan approval):
  - Duplicates keep the first occurrence, in input order.
  - `null` counts as a non-array value, so it answers 400. Only an absent `tags` defaults to `[]`.
  - The tag text is joined with `", "`.
- No Figma, analytics, or translation surfaces exist in this repository.

## Testing Strategy

- Unit tests (Vitest), one set per package (AC 5):
  - shared: happy, boundary, and unhappy tag inputs.
  - api: HTTP-level POST and GET with tags, including every 400 case.
  - web: rendering with and without tags.
- Integration: the api tests exercise the real `createApp` HTTP server against the shared helper, so they cover the api-to-shared path.
- Regression: the existing tests keep passing. The web fixtures change only to add `tags`.
- Root checks: `pnpm test`, `pnpm lint`, and `pnpm typecheck`. CI runs the same checks on the pull request, and the required `test` job runs `pnpm test`.
- Bundle size: `pnpm build && pnpm measure` locally, with the baseline updated when the size moves (AC 6). The CI `measure` job reports the same number, but no criterion depends on CI alone.
- There are no manual or end-to-end checks beyond the tasks above.

## Operational Requirements

- Merging into `main` requires the `test` status check to pass and 1 approving review, with squash merge only. These rules come from the repository ruleset "main" (id 26033321).
  - Where: GitHub repository ruleset on `panz3r/fijih-sample`.
  - Evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` `[{"context":"test","integration_id":15368}]` and `pull_request` `required_approving_review_count: 1` with `allowed_merge_methods: ["squash"]`. `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected", so classic branch protection adds no rules.
  - Owner: repository admin `panz3r`.
  - This change adds, removes, and renames no CI check contexts.
- The required approval comes from the Bookmarks team's QA Engineer `duckyduff369` (TEAMS.md).
  - Where: TEAMS.md and the GitHub reviewers on the pull request.
  - Evidence: TEAMS.md (in-repository), read during Plan.
  - Owner: the Bookmarks team.

## File List

- packages/shared/src/index.ts, packages/shared/src/index.test.ts (Copilot fix b9e5e46 touches index.ts only)
- packages/api/src/app.ts, packages/api/src/store.ts, packages/api/src/app.test.ts
- packages/web/src/render.ts, packages/web/src/render.test.ts
- measure/baseline.json
- .changeset/add-bookmark-tags.md
- _plans/fiji-work-items/FIJIH-41.md

## Implementation Record

- Task 1 (shared): added `Bookmark.tags`, `NewBookmark.tags?: unknown`, and `normalizeTags`; 7 new tests; shared tests 11 passed.
- Task 2 (api): `app.ts` passes `body.tags` through; `store.add` validates tags before the duplicate-URL check and throws `ValidationError("invalid tag")`; 11 new test cases (8 invalid forms); api tests 14 passed.
- Task 3 (web): `renderList` appends `<span class="tags">` with `tags.join(", ")` after the link only when tags exist; fixtures updated; 2 new tests; web tests 4 passed. Add form and main.ts unchanged.
- Task 4 (release): `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881` (delta 46 from 835); baseline set to 881, re-measure delta 0. Changeset `.changeset/add-bookmark-tags.md` (minor for shared, api, web). Root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass.

- Copilot pass (b9e5e46): `normalizeTags` dedupes with a `Set` instead of `out.includes`; behaviour unchanged, covered by existing shared dedupe tests and the api normalization test. Root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass; `pnpm build && pnpm measure` still 881, delta 0.

## Validation Evidence

- AC-1: passed — shared `normalizeTags` tests and api POST tests (absent gives `[]`, `["  News ", "news", "Tech"]` gives `["news", "tech"]`).
- AC-2: passed — api tests cover null, string, number, object, non-string entry, empty, 33-character, and whitespace tags (400 `{"error":"invalid tag"}`, nothing stored); 32 characters accepted.
- AC-3: passed — api GET tests return `tags` for both default and normalized cases.
- AC-4: passed — web render tests: `news, tech` after the title link; no tag element without tags.
- AC-5: passed — Vitest tests in shared (11), api (14), web (4).
- AC-6: passed — changeset added; baseline 881 matches `pnpm build && pnpm measure` (delta 0); root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass.

## Quality Gate

- Gate: concerns
- Reviewed head: e734293c81fe4bfc06e0c62692ada641e8e667ed
- Scope: whole branch diff against `main` (first review).
- Acceptance trace:
  - AC-1: implementation `normalizeTags` (packages/shared/src/index.ts), `store.add` (packages/api/src/store.ts), `app.ts` passes `body.tags` through; verification shared `normalizeTags` tests (absent, trim/lower-case/dedupe in order) and api tests "defaults tags to [] when absent" and "normalizes tags on POST and returns them on GET".
  - AC-2: implementation `normalizeTags` returns `null` for non-array, non-string entry, empty, over 32, or whitespace tags; `store.add` throws `ValidationError("invalid tag")` before the duplicate-URL check and before storing; verification api `it.each` over null, string, number, object, non-string entry, empty, 33-character, and whitespace tags (400 `{"error":"invalid tag"}`, list length unchanged) and "accepts a 32-character tag"; shared boundary tests.
  - AC-3: implementation `Bookmark.tags` is required and always set in `store.add`; verification api GET assertions for default `[]` and normalized tags.
  - AC-4: implementation `renderList` appends `<span class="tags">` with `tags.join(", ")` after the link only when tags exist (packages/web/src/render.ts); verification web tests (text `news, tech`, next sibling of the link; no `.tags` and item text `ExampleRemove` without tags). Add form and `main.ts` unchanged (user decision 1).
  - AC-5: shared 11, api 14, web 4 Vitest tests pass (re-run in this review).
  - AC-6: `.changeset/add-bookmark-tags.md` names `@sample/shared`, `@sample/api`, `@sample/web` with "Add tags to bookmarks"; `pnpm build && pnpm measure` re-run in this review prints `web_bundle_gzip_bytes=881`, delta 0 against `measure/baseline.json`; root `pnpm lint` and `pnpm typecheck` exit 0; `pnpm test` passes (see residual risk on the pre-existing flake).
- Findings: none.
- Residual risks:
  - Pre-existing flaky api test, outside this change: "creates, lists newest first, and deletes" (packages/api/src/app.test.ts) failed once in the first root `pnpm test` run of this review and 1 of 30 repeated `pnpm --filter @sample/api test` runs. Two POSTs in the same millisecond get equal `createdAt`, and `sortByCreatedDesc` (packages/shared/src/index.ts) then keeps insertion order, so the list reads `["A", "B"]`. Neither file's relevant code changed on this branch (last changed in 78b1748). It can fail the required CI `test` job. Confirm by repeating the api tests on `main`; fix in a separate issue (for example, inject `now` in the test or add a tie-breaker).
  - No Operational Requirements entry is `evidence: unverified`; no Validation Evidence line is `deferred`.

## Review Record

- Copilot review 5687130041 (head b56ac48), thread PRRT_kwDOVaYq_M6xPzF7 (packages/shared/src/index.ts:26, quadratic `out.includes` dedupe, no tag-count limit): `valid`. Fixed in b9e5e46 with a `Set`; a tag-count limit was not added because it would change the accepted-input contract (AC 1-2). Replied (comment 4404053942) and resolved.
- Copilot re-review 5687160053 (head b9e5e46): approval recommended, no open issues.
- Jira handoff draft (comment proposed; not posted; marker `FIJI-CONTEXT:FIJIH-41:fiji/orchestrate-development/v1`):

  > FIJI-CONTEXT:FIJIH-41:fiji/orchestrate-development/v1
  >
  > Outcome: bookmarks now carry optional `tags`. `POST /bookmarks` trims, lower-cases and de-duplicates them (first occurrence kept) and answers `400 {"error":"invalid tag"}` for a non-array value (including `null`), a non-string entry, an empty, over-32-character or whitespace-containing tag; `GET /bookmarks` returns `tags` on every bookmark; the web page shows them after the title as `news, tech`. Per the issue's decisions, the add form has no tags input, and filtering and editing tags are out of scope.
  >
  > Validation: Vitest tests in shared (11), api (14) and web (4); root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass locally. Pull request checks test, lint, typecheck, measure and scenarios succeeded on head b9e5e46.
  >
  > Review: pull request https://github.com/panz3r/fijih-sample/pull/4 (head b9e5e46). Copilot's one finding (quadratic `out.includes` dedupe in `normalizeTags`) was fixed in b9e5e46 with a `Set`; a tag-count limit was deliberately not added because it would change the accepted-input contract. Copilot's re-review reported no open issues. The QA Engineer duckyduff369 approved.
  >
  > Residual risks and follow-ups:
  > - Pre-existing flaky api test "creates, lists newest first, and deletes" (packages/api/src/app.test.ts), not caused by this change: two POSTs in the same millisecond get equal `createdAt`, and `sortByCreatedDesc` (packages/shared/src/index.ts) keeps insertion order for ties. It failed once in a root `pnpm test` run and in 1 of 30 repeated api test runs during local review, and can fail the required `test` job. A separate issue is recommended (for example inject `now` in the test or add a tie-breaker); none has been filed.
  > - Same-millisecond `createdAt` ties are the cause above and also affect list order for any bookmarks created in the same millisecond.
  > - Web bundle grew from 835 to 881 gzipped bytes (`measure/baseline.json` updated to 881).
  >
  > Operational: merging requires the `test` check and one approving review, squash merge only (repository ruleset "main"); the required approval comes from the Bookmarks team QA Engineer duckyduff369.

## Change Log

- 2026-10-28: Plan drafted from FIJIH-41 at revision `2026-10-28T18:30:03.635+0100`. It records the user's three answers to the earlier Plan block (no tags input on the add form; a non-array value or a non-string entry answers 400 invalid tag; a tag that is empty after trimming answers 400 invalid tag).
- 2026-10-28: Approved: plan-approval — approve
- 2026-10-28: Implementation complete; Jira FIJIH-41 moved from To Do to In Progress. Bundle baseline moved 835 to 881 bytes.
- 2026-10-28: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-28: Quality gate recorded: concerns (no findings; residual risk: pre-existing flaky api ordering test). Reviewed head e734293.
- 2026-10-28: Finalize (local QA review): all tasks checked and all acceptance criteria evidenced on `FIJIH-41-add-bookmark-tags` since `main`; no bookkeeping slips; checkpoint local-qa-review. Task entries name their work without commit hashes (listed under discrepancies). Quality gate concerns carried forward unchanged.
- 2026-10-28: Approved: local-qa-review — approve
- 2026-10-28: Delivery: pushed `FIJIH-41-add-bookmark-tags` (8 commits, first push) and opened draft pull request #4 (`[FIJIH-41] Add tags to bookmarks`, label `enhancement`, assignee `panz3r`, base `main`); Copilot automated review requested (timeline `review_requested` event). Changeset `.changeset/add-bookmark-tags.md` already present; no change intent added. No `(verify: ci)` criteria exist; no CI run measured. Human reviewers not requested (Ready-for-review).
- 2026-10-28: Copilot findings pass: 1 finding, valid, fixed in b9e5e46 and pushed (carried held commit 0917a19); thread replied and resolved; Copilot re-review clear. Checkpoint ready-for-review.
- 2026-10-28: Approved: ready-for-review — approve
- 2026-10-28: Ready for review: pull request #4 marked ready and review requested from `duckyduff369` (QA Engineer, Bookmarks team; timeline `review_requested` event). Work-item commit held locally; no Jira writes.
- 2026-10-28: Jira handoff draft written (comment proposed). Human review clear: duckyduff369 (QA Engineer) approved PR #4 on head b9e5e46, no unresolved threads, Copilot re-review clear. Nothing posted to Jira; checkpoint jira-handoff. Work-item commit held locally.
- 2026-10-28: Approved: jira-handoff — approve
- 2026-10-28: Jira handoff comment posted on FIJIH-41 (comment 10003, marker `FIJI-CONTEXT:FIJIH-41:fiji/orchestrate-development/v1`), exactly the approved draft; read back, one marked comment. No status change. Work-item commit held locally.
