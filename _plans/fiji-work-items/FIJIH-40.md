---
schema: fiji/work-item/v1
id: FIJIH-40
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-40
  revision: "2026-10-28T16:43:21.245+0100"
lifecycle:
  status: active
  phase: remote-review
  checkpoint: jira-handoff
  transition: handoff-drafted
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-40-add-bookmark-tags
  base_branch: null
  pull_request: https://github.com/panz3r/fijih-sample/pull/3
  jira_context_comment_id: null
---

# Work Item FIJIH-40: Add tags to bookmarks

## Story

As a user who keeps bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

Source: Jira story FIJIH-40 "Add tags to bookmarks" (no comments, no attachments, no Figma URL). Quoted from the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decisions: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

How this plan reads the issue's acceptance criteria:

- The 32-character and whitespace checks apply to each tag after trimming. If they applied before trimming, a tag with leading or trailing spaces would always fail, and trimming would never change an accepted tag.
- "Whitespace" means any character that matches the JavaScript `\s` class.
- "Longer than 32 characters" counts Unicode code points. A tag of exactly 32 characters is accepted.
- "Comma separated" means the tags joined with `, ` (a comma and a space).

Open product decisions. These are not in the issue, and they are asked at plan approval (see the risks):

1. **Tags input on the add form.** The issue's criteria cover only showing tags on the page. The current add form (`packages/web/index.html`, `packages/web/src/main.ts`) has only Title and URL. Without a new input, tags can be set only through the API. This plan leaves the form unchanged until the user answers.
2. **Malformed `tags` values.** The issue does not say what happens when `tags` is present but is not an array, when the array holds a value that is not a string, or when a tag is empty after trimming. Proposal: each of these answers 400 with `{"error":"invalid tag"}`.
3. **Order of returned tags.** The issue says tags are deduplicated but does not give their order. Proposal: keep the first occurrence of each tag, in the order the client sent them.
4. **README.** The `packages/shared` row in `README.md` lists that package's contents ("URL validation and normalisation, sorting"). After this change, that list would not mention tag normalisation. Should the README row be updated in this change?

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings answers 201. The created bookmark's `tags` holds each tag trimmed and lower-cased, and each resulting tag appears once. For example, `[" News ", "news", "Tech"]` gives exactly the tags `news` and `tech`.
2. `POST /bookmarks` without `tags`, or with `"tags": []`, creates a bookmark whose `tags` is `[]`.
3. `POST /bookmarks` answers 400 with the body `{"error":"invalid tag"}`, and stores no bookmark, when any tag is longer than 32 characters after trimming (for example 33 characters) or contains whitespace after trimming (for example `"two words"`). A tag of exactly 32 characters is accepted.
4. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags stored when that bookmark was created.
5. The web page shows each bookmark's tags after its title as one text, joined with `, ` (for example `news, tech`). When a bookmark has no tags, the page renders no tags element and no tags text for it.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–5. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. `measure/baseline.json` holds the gzipped web bundle size that `pnpm build` then `pnpm measure` print on this branch, so the printed `web_bundle_gzip_delta` is `0`.

## Tasks and Subtasks

- [x] Add tags to the shared model and a tag normaliser in `packages/shared/src/index.ts` (AC: 1, 2, 3, 6)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark`
  - [x] Add `MAX_TAG_LENGTH = 32` and a pure `normalizeTags(tags)` function. It trims, lower-cases, and deduplicates the tags, and returns `null` when any tag is invalid (more than 32 code points after trimming, or whitespace inside after trimming)
  - [x] Add tests to `packages/shared/src/index.test.ts`: trim, lower-case, dedupe, empty input, a 32-character tag accepted, a 33-character tag rejected, inner whitespace rejected, input not mutated
- [x] Accept, validate, store, and return tags in the API (AC: 1, 2, 3, 4, 6)
  - [x] `packages/api/src/store.ts`: `add` sets `tags` from `normalizeTags(input.tags ?? [])`, and throws `ValidationError("invalid tag")` when the result is `null`, before the bookmark is stored
  - [x] `packages/api/src/app.ts`: pass the request body's `tags` to `store.add`
  - [x] Add tests to `packages/api/src/app.test.ts`: create with tags (201 body), default `[]` when `tags` is missing, 400 `invalid tag` for 33 characters and for inner whitespace with no bookmark stored, `GET /bookmarks` returns the tags
- [x] Show tags after the title in the web list (AC: 5, 6)
  - [x] `packages/web/src/render.ts`: when `bookmark.tags` is not empty, add a `span.tags` with `tags.join(", ")` directly after the link. Group the link and the span so the existing `li` flex layout keeps them together, away from Remove. When there are no tags, render no span
  - [x] Add tests to `packages/web/src/render.test.ts`: tags joined with `, ` after the title, no tags element when `tags` is `[]`, and add `tags` to the existing fixtures
- [x] Run `pnpm build` then `pnpm measure`, and set `web_bundle_gzip_bytes` in `measure/baseline.json` to the printed size (AC: 7)
- [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root, and record the results in Validation Evidence (AC: 6)

## Engineering Context

- **Packages.** `@sample/shared` holds the `Bookmark`/`NewBookmark` types and pure helpers. `@sample/api` and `@sample/web` import it from source (`workspace:*`), so the type change reaches both without a build.
- **API.** `packages/api/src/app.ts` is a plain `node:http` handler. `BookmarkStore.add` in `packages/api/src/store.ts` does all validation by throwing `ValidationError(message)`, and the handler maps that to `400 {"error": message}`. The tag check goes there, before the duplicate-URL check stores anything. The store is in memory only, so existing data needs no migration.
- **Web.** `renderList` in `packages/web/src/render.ts` builds the DOM directly, and its tests run under jsdom (`packages/web/vite.config.ts`). In `packages/web/index.html`, each `li` uses `display: flex; justify-content: space-between`. A third child placed directly in the `li` would sit apart from the title, so the tags `span` goes into one wrapper with the link. `textContent` is used for the tags, so tag text is never parsed as HTML.
- **Out of scope** (from the issue): filtering or searching by tag, and editing the tags of an existing bookmark. The add form is unchanged unless open decision 1 says otherwise.
- **Change intent.** Under `AGENTS.md`, the pull request adds a changeset whose summary is `Add tags to bookmarks`, for `@sample/shared`, `@sample/api`, and `@sample/web`. Delivery adds it (`fiji-deliver-change`). It is not an Implementation task.
- **Conventions.** Branch `FIJIH-40-add-bookmark-tags`. Conventional Commits (`feat:`, `test:`, `chore:`), one logical change per commit. Pull request title `[FIJIH-40] Add tags to bookmarks`, label `enhancement` (the issue is a Story), reviewer `duckyduff369` (the QA Engineer in `TEAMS.md`).

## Testing Strategy

- **Unit (shared).** Cover `normalizeTags` happy paths (trim, lower-case, dedupe, empty) and unhappy paths (33 code points, inner space or tab). Cover the 32-character boundary.
- **Integration (api).** `app.test.ts` already starts the real HTTP server on an ephemeral port. Extend it for: create with tags, the default `[]`, 400 `invalid tag` with nothing stored (a follow-up `GET` does not list it), and `GET` returning tags. Use URLs that no existing test uses, because the store is shared across the file.
- **DOM (web).** Use jsdom tests of `renderList`. Check the tags text after the link, check that no tags element exists when there are no tags, and keep the empty-state and Remove tests passing.
- **Repository checks.** `pnpm test`, `pnpm lint`, and `pnpm typecheck` run from the root, the same commands CI's `test`, `lint`, and `typecheck` jobs run.
- **Bundle size.** `pnpm build` then `pnpm measure` runs locally (AC 7). CI's `measure` job prints the same number but never fails on its own.
- **Not planned.** No manual, live-app, or end-to-end check is planned. Migration and design work are not needed: the store is in memory, and there is no Figma reference.

## Operational Requirements

- **Required status check `test` on `main`.** Where: repository ruleset `main` (id 26033321), which targets `~DEFAULT_BRANCH`, enforcement `active`. Evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returned the rule `required_status_checks` with the context `test` (integration_id 15368, GitHub Actions) and `strict_required_status_checks_policy: false`. Owner: repository admins (`panz3r`). This change adds, removes, and renames no CI check contexts.
- **Pull request rules on `main`.** At least 1 approving review, squash merge only, and `require_extra_approval_for_unattributed_changes: true`; deletion and non-fast-forward are blocked. Where: the same ruleset `main` (id 26033321). Evidence: the same `gh api` read returned the `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`, plus the `deletion` and `non_fast_forward` rules. Bypass: the repository role with id 5 (admin), `always`. Owner: repository admins (`panz3r`).
- **No classic branch protection.** Where: the `main` branch protection. Evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected". Owner: repository admins (`panz3r`).
- **No organization rulesets.** Where: the repository owner. Evidence: `gh api users/panz3r --jq .type` returned `User`, so the repository is user-owned and no organization rulesets apply. Owner: not applicable.
- **The `test` job sleeps first.** It sleeps for `CI_DELAY_SECONDS` before running, so the required check takes at least that long. Where: repository Actions variable `CI_DELAY_SECONDS`. Evidence: `gh api repos/panz3r/fijih-sample/actions/variables` returned `CI_DELAY_SECONDS=120`, which `.github/workflows/ci.yml` reads (`sleep "${{ vars.CI_DELAY_SECONDS || 0 }}"`). Owner: repository admins (`panz3r`).

## File List

- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- measure/baseline.json
- packages/shared/src/index.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- packages/shared/src/index.test.ts
- _plans/fiji-work-items/FIJIH-40.md

## Implementation Record

- Task 1 (shared): hypothesis: a pure `normalizeTags` returning `null` on invalid input satisfies AC 1-3 at the unit level. Checked with `pnpm --filter @sample/shared test` (10 passed), `typecheck` and `lint packages/shared` clean. Empty-after-trim tags return `null` (default for open decision 2).
- Task 2 (api): hypothesis: validating in `BookmarkStore.add` before the duplicate-URL check gives 400 `invalid tag` with nothing stored. The store also rejects non-array or non-string `tags` at runtime (default for open decision 2). Checked with `pnpm --filter @sample/api test` (7 passed), `typecheck` and `lint packages/api` clean.
- Task 3 (web): hypothesis: wrapping the link and a `span.tags` in one `span` keeps them together in the flex `li` and renders no tags element when empty. Tags use `textContent`. `pnpm --filter @sample/web test` (4 passed), `typecheck` and `lint packages/web` clean.
- Task 4 (baseline): `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=892` (baseline was 835); set `measure/baseline.json` to 892, and `pnpm measure` then printed `web_bundle_gzip_delta=0`.
- Task 5 (root checks): `pnpm test`, `pnpm lint`, `pnpm typecheck` passed from the repository root.

- Review fix c1ef1e5 (Copilot findings): `normalizeTags` checks whitespace and length on the trimmed tag before lower-casing; `BookmarkStore.add` defaults to `[]` only for `undefined`, so `null` answers 400 `invalid tag`. Files: packages/shared/src/index.ts, packages/shared/src/index.test.ts, packages/api/src/store.ts, packages/api/src/app.test.ts. Checked with `pnpm test` (shared 11, api 7, web 4), `pnpm lint`, `pnpm typecheck`; `pnpm measure` delta 0.

## Validation Evidence

- AC-1: passed — shared `normalizeTags` tests (trim, lower-case, dedupe) and api test "trims, lower-cases, and deduplicates tags" (`[" News ", "news", "Tech"]` gives `news`, `tech`, status 201).
- AC-2: passed — api test "defaults tags to []" (tags missing and `[]`).
- AC-3: passed — api test "answers 400 invalid tag and stores nothing" (33 characters, inner whitespace, non-string, blank, non-array; follow-up GET lists none) and "accepts a 32-character tag"; shared boundary tests.
- AC-4: passed — api test checks `GET /bookmarks` returns the created tags.
- AC-5: passed — web tests: `news, tech` in `.tags` directly after the link; no `.tags` element when `tags` is `[]`.
- AC-6: passed — tests in shared (10), api (7), web (4); `pnpm test`, `pnpm lint`, `pnpm typecheck` pass from the root.
- AC-7: passed — `pnpm build` then `pnpm measure`: `web_bundle_gzip_bytes=892`, `web_bundle_gzip_delta=0` with `measure/baseline.json` at 892.

## Quality Gate

Gate: concerns

Acceptance trace:

- AC-1: implementation `normalizeTags` in `packages/shared/src/index.ts` (trim, lower-case, `Set` dedupe in first-occurrence order), called from `BookmarkStore.add` in `packages/api/src/store.ts`; verification: shared test "trims, lower-cases, and deduplicates, keeping first-occurrence order" and api test "trims, lower-cases, and deduplicates tags on create and returns them on list" (`[" News ", "news", "Tech"]` gives 201 and `["news", "tech"]`).
- AC-2: implementation `input.tags ?? []` in `BookmarkStore.add`; verification: api test "defaults tags to []" (`tags` missing and `[]`), shared test "returns an empty list for empty input".
- AC-3: implementation the tag check in `BookmarkStore.add` runs before the duplicate-URL check and before `items.set`, throwing `ValidationError("invalid tag")`, which `packages/api/src/app.ts` maps to 400; verification: api tests "answers 400 invalid tag and stores nothing" (33 characters, `"two words"`, non-string, blank, non-array; follow-up GET lists none) and "accepts a 32-character tag"; shared boundary, code-point, and whitespace tests.
- AC-4: implementation `tags` is stored on the `Bookmark` and `store.list()` returns it; verification: api test reads `GET /bookmarks` and finds the created tags. The GET of an untagged bookmark is not asserted directly; it returns the same stored object whose `tags` the POST test shows as `[]`.
- AC-5: implementation `renderList` in `packages/web/src/render.ts` wraps the link and, only when `tags` is not empty, a `span.tags` with `tags.join(", ")` set through `textContent`; verification: web tests "shows tags after the title joined with a comma and space" (`news, tech`, previous sibling is the link) and "renders no tags element when a bookmark has no tags" (no `.tags`, `li` text `ExampleRemove`).
- AC-6: verification re-run at the reviewed head: shared 10, api 7, web 4 tests passed; `pnpm test`, `pnpm lint`, `pnpm typecheck` passed from the root.
- AC-7: verification re-run at the reviewed head: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=892` and `web_bundle_gzip_delta=0`; `measure/baseline.json` holds 892.

Plan defaults judged against the criteria: add form unchanged (AC-5 asks only to show tags; no criterion asks for form input), malformed tags answer 400 `invalid tag` (consistent with AC-3), first-occurrence order (consistent with AC-1's example), README unchanged (no criterion covers it). None contradicts a criterion.

Findings:

- minor, `packages/shared/src/index.ts` (`normalizeTags`): the 32-code-point limit is checked after lower-casing, not on the trimmed tag, so a tag whose lower-case form is longer is rejected. Reproduced: 32 x `U+0130` (32 code points after trimming) returns `null`, because `"\u0130".toLowerCase()` is 2 code points. AC-3 says a tag of exactly 32 characters after trimming is accepted. ASCII and the planned examples are unaffected. Fix: measure `[...raw.trim()].length` before lower-casing.
- minor, `packages/api/src/store.ts` (`BookmarkStore.add`): `"tags": null` is treated as missing and creates a bookmark with `tags: []` (201), through `input.tags ?? []`. Reproduced with `BookmarkStore.add({ ..., tags: null })` returning `[]`. The default taken for open decision 2 says a `tags` value that is present but not an array answers 400 `invalid tag`. No criterion covers `null`.

Residual risks: none beyond the findings. No Operational Requirements entry is `evidence: unverified`, and no Validation Evidence line is `deferred`.

Reviewed head: 902f9310942705d241a1eead187c8f4f68cc9f7e

## Review Record

- PRRT_kwDOVaYq_M6xNFKR (packages/api/src/store.ts, Copilot, `?? []` accepts `"tags": null`): valid; fixed in c1ef1e5; replied; resolved.
- PRRT_kwDOVaYq_M6xNFLS (packages/shared/src/index.ts, Copilot, length checked after lower-casing): valid; fixed in c1ef1e5; replied; resolved.
- Jira handoff draft: comment to post on FIJIH-40 (marker `FIJI-CONTEXT:FIJIH-40:fiji/orchestrate-development/v1`):

  > FIJI-CONTEXT:FIJIH-40:fiji/orchestrate-development/v1
  >
  > Outcome: bookmarks now take an optional `tags` list. `POST /bookmarks` trims, lower-cases and deduplicates tags (first occurrence kept, client order) and answers 400 `{"error":"invalid tag"}` for a tag longer than 32 characters or containing whitespace after trimming; `GET /bookmarks` returns `tags` on every bookmark; the web page shows tags after the title joined with `, ` and renders no tags element when there are none. Pull request: https://github.com/panz3r/fijih-sample/pull/3 (changeset `.changeset/fijih-40-add-tags.md`). The `test` check of the `ci` workflow succeeded on c1ef1e5 (run 40721198073); duckyduff369 (QA Engineer) approved c1ef1e5, and Copilot's re-review of c1ef1e5 left no open issues.
  >
  > Validation: acceptance criteria 1-7 are covered by Vitest tests in `packages/shared`, `packages/api` and `packages/web`; `pnpm test`, `pnpm lint` and `pnpm typecheck` pass from the root. The gzipped web bundle grew from 835 to 892 bytes (+57) and `measure/baseline.json` was updated to 892.
  >
  > Decisions taken by default, because plan approval was answered only "approve" and the Plan questions were not answered: (1) the add form is unchanged, so tags can be set only through the API; (2) a `tags` value that is not an array, holds a non-string, or holds a tag that is empty after trimming answers 400 `invalid tag`, and so does `"tags": null`; (3) tags keep first-occurrence order; (4) `README.md` is unchanged, so its `packages/shared` row does not mention tag normalisation.
  >
  > Review fixes: a local quality review and Copilot found the same two minor issues, both fixed in c1ef1e5: the 32-character limit is now checked on the trimmed tag before lower-casing (a tag of 32 `U+0130` characters was rejected because its lower-case form is longer), and `"tags": null` now answers 400 instead of creating a bookmark with `[]`.
  >
  > Follow-ups and limits: filtering or searching by tag and editing the tags of an existing bookmark are out of scope per the issue and not implemented; an add-form tags input and a README update remain open product decisions for a later issue. No other residual risk is recorded in the Quality Gate.

## Change Log

- Drafted from FIJIH-40 at revision 2026-10-28T16:43:21.245+0100. The issue was assigned to the current user.
- Approved: plan-approval — approve
- Open Plan questions were not answered beyond "approve"; defaults taken at approval: add form unchanged, malformed tags answer 400 `invalid tag`, first-occurrence order kept, README not changed.
- Implementation complete: all tasks checked off; checkpoint `implementation-approval`. Bundle baseline moved 835 to 892 bytes (+57).
- Approved: implementation-approval — automatic (no risk triggers)
- Quality gate: concerns at 902f931 (two minor findings: tag length checked after lower-casing; `"tags": null` accepted as `[]`).
- Finalize: File List matches the branch diff since main; Validation Evidence has one passing line per criterion (AC-1 to AC-7); no record changes needed. Discrepancy kept: Implementation Record entries for Tasks 1-5 name the task but cite no commit SHA (checked tasks, so not blocking). Checkpoint local-qa-review.
- Approved: local-qa-review — approve
- Delivery: changeset `.changeset/fijih-40-add-tags.md` (summary "Add tags to bookmarks") committed in f98e78a and pushed with the branch. Draft PR #3 (https://github.com/panz3r/fijih-sample/pull/3) opened against `main`, title `[FIJIH-40] Add tags to bookmarks`, label `enhancement`, assignee panz3r. Copilot review requested (review_requested event confirmed in the timeline). Reviewers are not requested while the PR is draft; the QA Engineer `duckyduff369` is requested at ready-for-review.
- Quality findings still open at delivery: tag length checked after lower-casing; `"tags": null` accepted as `[]`. Plan defaults unchanged (add form unchanged, README unchanged).
- Copilot pass: 2 findings (both matched the open QA minor findings and were in scope of AC-3 and open decision 2), fixed in c1ef1e5 and pushed; threads resolved; Copilot re-review requested.
- Copilot re-review at c1ef1e5: approval recommended, no open issues; both threads resolved; ci run 22 on c1ef1e5 passed. Checkpoint ready-for-review.
- Approved: ready-for-review — approve
- Ready for review: PR #3 marked ready, review requested from `duckyduff369` (QA Engineer, owning team Bookmarks; author `panz3r` excluded). Work-item commit held locally, not pushed.
- Jira handoff draft written from current evidence (PR #3 head c1ef1e5, one approval from duckyduff369, ci run 40721198073 succeeded); nothing posted to Jira. Checkpoint jira-handoff. Commit held locally.
