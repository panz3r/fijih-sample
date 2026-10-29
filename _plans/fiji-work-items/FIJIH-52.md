---
schema: fiji/work-item/v1
id: FIJIH-52
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-52
  revision: 2026-10-29T19:10:08.049+0100
lifecycle:
  status: active
  phase: qa-review
  checkpoint: null
  transition: quality-gate-recorded
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-52-add-tags
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-52: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group related bookmarks.

## Product Context

- Source: Jira FIJIH-52 (Story, Medium, label `scenario-S1`), no comments, no attachments, no Figma link. The issue holds all the product context.
- Context in the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions in the issue: tags are not filterable yet.
- Out of scope in the issue: filtering or searching by tag; editing tags of an existing bookmark.
- Decisions from the user at plan approval (conditional approval, verbatim: "Approve. Answers: 1 no tags input on the add form; 2 a non-array tags value or a non-string item answers 400 invalid tag; 3 a tag empty after trimming is rejected with 400 invalid tag; 4 confirmed: trim first, reject only interior whitespace, and count the 32-character limit on the trimmed tag."): the web add form gets no tags input (out of scope); a non-array `tags` value, a non-string item, and a tag empty after trimming each answer 400 `{"error":"invalid tag"}`; validation trims first, rejects only interior whitespace, and counts the 32-character limit on the trimmed tag.

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings stores each tag trimmed and lower-cased, with duplicates removed after normalization, in first-occurrence order. Example: `["  Work ", "work", "READ"]` is stored and returned as `["work", "read"]`. The 201 response body includes `tags`.
2. `POST /bookmarks` without `tags` stores and returns `tags: []`.
3. `POST /bookmarks` with a `tags` value that is not an array, an item that is not a string, or a tag that, after trimming, is empty, is longer than 32 characters, or still contains whitespace answers 400 with body `{"error":"invalid tag"}` and stores nothing. A 32-character tag is accepted; a 33-character tag is rejected; `"a b"` is rejected; `" ab "` is accepted as `"ab"`; `""` and `"   "` are rejected; `"work"` (a string instead of an array) and `[1]` are rejected.
4. `GET /bookmarks` returns a `tags` array on every bookmark (`[]` when it has none), in stored order.
5. The web list shows each bookmark's tags after its title, joined with `", "` (for example `work, read`), and renders no tag element or text for a bookmark with no tags.
6. Vitest tests cover the new behaviour in `packages/shared`, `packages/api`, and `packages/web`, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Add tag support to `packages/shared` (AC: 1, 3, 6)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a pure tag helper (for example `normalizeTags(values)`, returning the trimmed, lower-cased, deduplicated tags in first-occurrence order, and `isValidTag(tag)`, false for an empty tag, more than 32 characters, or any whitespace character). Export both from `src/index.ts`.
  - [x] Add tests in `src/index.test.ts`: trim, lower-case, dedupe after normalization, order kept, the 32/33-character boundary, interior whitespace rejected, an empty tag rejected, the input not mutated.
- [x] Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 4, 6)
  - [x] In `src/app.ts`, pass `body.tags` from the POST body to the store.
  - [x] In `src/store.ts` `add`, normalize the tags with the shared helper, throw `ValidationError("invalid tag")` when `tags` is present but not an array, when any item is not a string, or when any normalized tag is invalid, including empty after trimming (before the bookmark is stored), default to `[]`, and save `tags` on the bookmark.
  - [x] Add tests in `src/app.test.ts`: POST with tags (normalized in the 201 body), POST without tags (`[]`), GET returns the tags of each bookmark, a 33-character tag, a tag with interior whitespace, an empty or whitespace-only tag, a non-array `tags` value, and a non-string item each answer 400 `{"error":"invalid tag"}`, and a rejected POST adds nothing to the list.
- [x] Show tags in `packages/web` (AC: 5, 6)
  - [x] In `src/render.ts`, after the title link, append an element (for example `<span class="tags">`) holding `bookmark.tags.join(", ")` only when the bookmark has tags.
  - [x] Update the fixtures in `src/render.test.ts` to the new `Bookmark` type, and add tests: tags shown after the title, comma separated; no tag element and no extra text when `tags` is empty.
- [x] Record the release work (AC: 6)
  - [x] Add a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary `Add tags to bookmarks`.
  - [x] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_bytes` differs from `measure/baseline.json` (835), update the baseline in this change and record both numbers in Validation Evidence.
- [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results (AC: 6)

## Engineering Context

- Workspace: pnpm with `packages/shared` (types and pure functions, imported from source by the other two), `packages/api` (Node `http` service with an in-memory `BookmarkStore`), and `packages/web` (Vite page, Vitest with jsdom).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, and the existing pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). The tag helpers belong here, following the same style.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates the title and URL and throws `ValidationError(message)`. `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` gives the required body with no change to the error handling.
  - `packages/api/src/app.ts`: the POST handler casts the body to `{ url?: string; title?: string }` and builds the store input. Extend the cast with `tags`.
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with a title link and a Remove button. `packages/web/src/main.ts` fetches `/bookmarks` and posts the add form (title and URL only).
  - `packages/web/index.html`: `li` is `display: flex; justify-content: space-between`, so a tags element between the link and the button sits in the middle of the row. No style change is required by the criteria.
- Storage is in memory only, so there is no data migration. Every bookmark created after this change has `tags`.
- Making `Bookmark.tags` required changes the type that `render.test.ts` fixtures use; update them, or the web type-check fails.
- Validation runs on the normalized tag (after trim and lower-case), so leading and trailing whitespace is accepted and trimmed, while interior whitespace is rejected (AC 3). Whitespace means any character that matches `/\s/`. Length is counted on the normalized tag. A tag that is empty after trimming is invalid. This trim-first reading was confirmed by the user at plan approval.
- Conventions (AGENTS.md): branch `FIJIH-52-add-tags`; Conventional Commits, one logical change per commit, subject under 72 characters (for example `feat: add tag helpers to shared`, `feat: accept and return bookmark tags in the api`, `feat: show bookmark tags on the web page`, `chore: add changeset for bookmark tags`); every behaviour change has a Vitest test in the package it changes; a changeset is required because packages change; the bundle baseline moves in the same pull request that knowingly moves it.

### Open questions

None. The four questions raised in the first plan were answered by the user at plan approval (see Product Context and the Change Log):

1. Web add form: out of scope. The add form (`packages/web/index.html`, `src/main.ts`) gets no tags input (user answer 1).
2. Malformed `tags` (not an array, or a non-string item): 400 `{"error":"invalid tag"}` (user answer 2; AC 3).
3. A tag empty after trimming: rejected with 400 `{"error":"invalid tag"}` (user answer 3; AC 3).
4. Trim first, reject only interior whitespace, 32-character limit counted on the trimmed tag: confirmed (user answer 4).

## Testing Strategy

- `packages/shared` (Vitest, `src/index.test.ts`): unit tests for the tag helpers. Happy path: trim, lower-case, dedupe, order kept, empty input gives `[]`. Unhappy path: an empty tag, 33 characters, interior space, tab, and newline are invalid; a 32-character tag is valid.
- `packages/api` (Vitest, `src/app.test.ts`, real HTTP against `createApp()` on an ephemeral port): POST with and without tags, GET returning tags, 400 `{"error":"invalid tag"}` for an over-long tag, an interior-whitespace tag, an empty or whitespace-only tag, a non-array `tags` value, and a non-string item, and a rejected POST leaving the list unchanged. Tests in this file share one server and store, so each test uses unique URLs to avoid `url already bookmarked`.
- `packages/web` (Vitest with jsdom, `src/render.test.ts`): tags rendered after the title link, comma separated; nothing rendered for `tags: []`.
- Integration: the API tests exercise the shared helper through the store and the HTTP layer. No live-app or end-to-end check is required by the issue.
- Release: `pnpm build` and `pnpm measure` for the bundle size, and a changeset.
- Gates from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (the same commands CI runs in the `test`, `lint`, and `typecheck` jobs of `.github/workflows/ci.yml`).

## Operational Requirements

- Required status check `test` on `main` (the `test` job of the `ci` workflow, which runs on `pull_request`) — where: repository ruleset `main` (id 26033321, active, target `~DEFAULT_BRANCH`); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returns rule `required_status_checks` with context `test` (integration_id 15368), strict policy false; owner: repository admins of `panz3r/fijih-sample` (`panz3r`).
- One approving review and squash merge only on `main` — where: the same ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returns rule `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admins (`panz3r`). AGENTS.md and TEAMS.md name the QA Engineer `duckyduff369` as the reviewer whose approval is needed.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returns 404 "Branch not protected".
- This change adds, removes, and renames no CI check contexts, and needs no secrets, environments, deploy configuration, or other repositories. The repository's only environment, `copilot` (`gh api repos/panz3r/fijih-sample/environments`, no protection rules), is not used by this change.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/app.ts
- packages/api/src/store.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- .changeset/add-bookmark-tags.md
- measure/baseline.json

## Implementation Record

Task 1 — shared tag support: `Bookmark.tags`, optional `NewBookmark.tags`, `normalizeTags`, `isValidTag` (empty, >32 chars, or any `/\s/` is invalid), with 7 new tests.
Task 2 — api tags: POST passes `body.tags`; `BookmarkStore.add` validates via `parseTags` (non-array, non-string item, or invalid normalized tag throws `ValidationError("invalid tag")` before storing), defaults `[]`, saves `tags`; 6 new test cases plus 3 more.
Task 3 — web tags: `renderList` appends `<span class="tags">` with `tags.join(", ")` between the title link and Remove only when tags exist; fixtures updated; 2 new tests.
Task 4 — release: changeset `.changeset/add-bookmark-tags.md` (minor for shared, api, web; summary `Add tags to bookmarks`); `pnpm build` then `pnpm measure` gave 881 bytes against the 835 baseline, so `measure/baseline.json` is now 881.
Task 5 — root validation: `pnpm test`, `pnpm lint`, `pnpm typecheck` all passed from the repository root.

## Validation Evidence

- Task 1 focused: `pnpm --filter @sample/shared test` 11 passed; `pnpm --filter @sample/shared typecheck` passed.
- Task 2 focused: `pnpm --filter @sample/api test` 12 passed; `pnpm --filter @sample/api typecheck` passed; `pnpm lint packages/api packages/shared` clean.
- Task 3 focused: `pnpm --filter @sample/web test` 4 passed; typecheck passed; `pnpm lint packages/web` clean.
- Task 4: `web_bundle_gzip_bytes` was 835 in `measure/baseline.json`, now 881 (delta +46); baseline updated, `pnpm measure` then reports delta 0.
- AC-1: passed — shared `normalizeTags` tests and api test (`["  Work ", "work", "READ"]` gives `["work", "read"]` in the 201 body).
- AC-2: passed — api test: POST without tags returns and lists `tags: []`.
- AC-3: passed — api tests: 33 chars, interior whitespace, empty, whitespace-only, non-array, non-string item each 400 `{"error":"invalid tag"}` with nothing stored; 32 chars and `" ab "` accepted.
- AC-4: passed — api test: GET /bookmarks returns `tags` in stored order, `[]` when none.
- AC-5: passed — web tests: `work, read` in `.tags` after the title link; no `.tags` element for empty tags.
- AC-6: passed — tests in shared (11), api (12), web (4); root `pnpm test`, `pnpm lint`, `pnpm typecheck` passed.

## Quality Gate

Gate: concerns. Every acceptance criterion is evidenced and every required validation passed; one minor finding remains.

Acceptance trace:

- AC-1: implementation `normalizeTags` (`packages/shared/src/index.ts`), `parseTags` and `tags` saved on the bookmark (`packages/api/src/store.ts`), `body.tags` passed through (`packages/api/src/app.ts`); verification shared test `trims, lower-cases, dedupes after normalization, and keeps first-occurrence order`, api test `stores normalized tags and returns them on create and list` (`["  Work ", "work", "READ"]` gives `["work", "read"]` in the 201 body and the list).
- AC-2: implementation `parseTags` returns `[]` for an absent value; verification api test `defaults tags to an empty array` (201 body and list).
- AC-3: implementation `parseTags` (non-array or non-string item, then `isValidTag` on each normalized tag) throws `ValidationError("invalid tag")` before the duplicate check and before storing; verification api tests `accepts a 32-character tag and a padded tag` and the six `rejects ... with 400 invalid tag and stores nothing` cases (33 characters, `"a b"`, `""`, `"   "`, `"work"`, `[1]`), shared `isValidTag` tests (32/33 boundary, empty, space, tab, newline).
- AC-4: implementation `tags` stored on every new bookmark and returned by `list()`; verification api tests on the GET list (`["work", "read"]` in stored order, `[]` when none).
- AC-5: implementation `renderList` appends `<span class="tags">` with `tags.join(", ")` between the title link and Remove only when tags exist (`packages/web/src/render.ts`); verification web tests `shows tags after the title, comma separated` (`work, read`, previous sibling is the link) and `renders no tag element or text when there are no tags` (no `.tags`, row text `ExampleRemove`).
- AC-6: Vitest tests added in all three packages; re-run at the reviewed head from the repository root: `pnpm test` (shared 11, api 12, web 4 passed), `pnpm lint` exit 0, `pnpm typecheck` exit 0. Release work: changeset `.changeset/add-bookmark-tags.md` (summary `Add tags to bookmarks`), `measure/baseline.json` 835 to 881 in this change.

Findings:

- minor — `isValidTag` in `packages/shared/src/index.ts`: the 32-character limit uses `String.length` (UTF-16 code units), so a character outside the Basic Multilingual Plane counts as two. Reproduced: a tag of 20 emoji (20 characters, length 40) is rejected with 400 `invalid tag`, although AC 3 rejects only tags longer than 32 characters. ASCII and BMP tags, which all the criteria's examples use, are unaffected. Lower-casing that expands a character (for example `İ` to `i̇`) also lengthens the tag, which matches the plan-approval decision to count the limit on the trimmed, normalized tag. Acceptable as follow-up: count code points (`[...tag].length`) or agree the unit in the issue.

Residual risks: none. Operational Requirements have no `evidence: unverified` entry, and no Validation Evidence line is `deferred` or `pending-ci`.

Reviewed head: 1687c164a597907797ebb43f566e4f5a8629f5d4

## Review Record

## Change Log

- 2026-10-29: Drafted from Jira FIJIH-52 at revision 2026-10-29T19:10:08.049+0100 (after assigning the issue to the current user).
- 2026-10-29: Plan-approval conditional approval, user's words: "Approve. Answers: 1 no tags input on the add form; 2 a non-array tags value or a non-string item answers 400 invalid tag; 3 a tag empty after trimming is rejected with 400 invalid tag; 4 confirmed: trim first, reject only interior whitespace, and count the 32-character limit on the trimmed tag." Applied: AC 3 and its tasks and tests cover non-array tags, non-string items, and empty-after-trim tags; the add form tags input is recorded as out of scope; open questions resolved.
- 2026-10-29: Approved: plan-approval — conditional: Approve. Answers: 1 no tags input on the add form; 2 a non-array tags value or a non-string item answers 400 invalid tag; 3 a tag empty after trimming is rejected with 400 invalid tag; 4 confirmed: trim first, reject only interior whitespace, and count the 32-character limit on the trimmed tag. (verified at 0164c06)
- 2026-10-29: Task 1 (shared tag helpers) implemented and checked off.
- 2026-10-29: Task 2 (api tags) implemented and checked off.
- 2026-10-29: Task 3 (web tags) implemented and checked off.
- 2026-10-29: Task 4 (changeset and bundle baseline 835 to 881) done and checked off.
- 2026-10-29: Task 5 root validation passed; implementation complete, checkpoint implementation-approval.
- 2026-10-29: Approved: implementation-approval — automatic (no risk triggers)
- 2026-10-29: Quality review recorded gate concerns at 1687c16 (one minor finding: tag length counted in UTF-16 code units).
