---
schema: fiji/work-item/v1
id: FIJIH-83
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-83
  revision: 2026-11-03T18:59:24.934+0100
lifecycle:
  status: active
  phase: qa-review
  checkpoint: local-qa-review
  transition: qa-reviewed
  attempt: 1
quality:
  gate: pass
artifacts:
  branch: FIJIH-83-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-83: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give a bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

- Source: Jira story FIJIH-83 "Add tags to bookmarks" (type Story, priority Medium, label `scenario-S1`), revision `2026-11-03T18:59:24.934+0100`. No comments, attachments, or Figma links.
- Issue context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions from the issue: tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Decisions from the user at plan approval (answers to the earlier Plan result's questions):
  - Q1. The web page's Add form gets no tags input; tags are set only through the API.
  - Q2. (a) The 32-character limit and the whitespace check apply after trimming, so `"  work "` is valid and stored as `work`. (b) A tag that is empty after trimming (`""`, `"   "`) is rejected with 400 `{"error":"invalid tag"}`. (c) A `tags` value that is not an array, or an element that is not a string, answers 400 `{"error":"invalid tag"}`. (d) Characters are counted as Unicode code points.
  - Q3. Deduplication keeps input order, first occurrence wins; "comma separated" means the separator `", "`.

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings answers 201 and the created bookmark's `tags` holds each tag trimmed and lower-cased, with duplicates (after trimming and lower-casing) removed, keeping the first occurrence's position; for example `["Work", " work ", "Read"]` yields `["work", "read"]`.
2. `POST /bookmarks` without `tags` answers 201 and the created bookmark's `tags` is `[]`.
3. `POST /bookmarks` with a tag whose trimmed value is longer than 32 Unicode code points, contains whitespace (for example `"read later"`), or is empty (for example `""` or `"   "`), answers 400 with body `{"error":"invalid tag"}` and stores no bookmark; a trimmed tag of exactly 32 code points is accepted, and `"  work "` is accepted and stored as `work`.
4. `POST /bookmarks` with a `tags` value that is not an array, or an array with an element that is not a string (for example `"work"`, `5`, `["a", 1]`), answers 400 with body `{"error":"invalid tag"}` and stores no bookmark.
5. `GET /bookmarks` returns each bookmark with its `tags` array, as stored at creation.
6. The web page shows each bookmark's tags after its title, joined with `", "` (for example `work, read`), and renders no tag element or text for a bookmark whose `tags` is empty.
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build` then `pnpm measure` prints on this branch (`web_bundle_gzip_delta=0`), per the AGENTS.md rule for pull requests that knowingly move the bundle size.

## Tasks and Subtasks

- [x] Add tag normalization and validation to `packages/shared` (AC: 1, 2, 3, 4, 7)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a pure `normalizeTags(input: unknown): string[]` (or equivalent) that defaults a missing value to `[]`, trims, lower-cases, deduplicates keeping first occurrence, and throws or reports an invalid tag for a non-array `tags` value, a non-string element, a trimmed tag that is empty, longer than 32 code points (count with `Array.from(tag).length`), or containing whitespace.
  - [x] Unit tests in `packages/shared/src/index.test.ts`: normalization, dedup order, default `[]`, the 32/33 code-point boundary (including a multi-code-point character), internal whitespace, empty and whitespace-only tags, a non-array value, and a non-string element.
- [x] Accept and return tags in `packages/api` (AC: 1, 2, 3, 4, 5, 7)
  - [x] `app.ts`: pass `body.tags` through to `store.add`.
  - [x] `store.ts`: normalize tags with the shared function, map an invalid tag to `ValidationError("invalid tag")` before any insert, and store `tags` on the bookmark.
  - [x] Tests in `packages/api/src/app.test.ts` (and `store.test.ts` where simpler): create with tags, create without tags, 400 `{"error":"invalid tag"}` for a too-long, a whitespace, an empty, a non-array, and a non-string-element tag with the list unchanged afterwards, and `GET /bookmarks` returning `tags`.
- [x] Show tags in `packages/web` (AC: 6, 7)
  - [x] `render.ts`: after the title link, append an element holding `bookmark.tags.join(", ")` only when `tags` is non-empty.
  - [x] Tests in `packages/web/src/render.test.ts`: tags shown after the title as `work, read`; no tag element or text when `tags` is `[]`; update existing fixtures to the new `Bookmark` shape.
- [x] Run the repository checks from the root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 7)
- [x] Run `pnpm build` then `pnpm measure` and update `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value so `web_bundle_gzip_delta=0` (AC: 8)

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported by `@sample/api` and `@sample/web` from source (`packages/shared/package.json` exports `./src/index.ts`). Node >= 24; the API runs under `node --experimental-strip-types`, so API code keeps `.ts` import specifiers and avoids TypeScript-only runtime syntax (enums, parameter properties).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` is optional on input while required on `Bookmark`.
  - `packages/api/src/app.ts`: `POST /bookmarks` reads the JSON body as `{ url?, title? }` and calls `store.add`; `ValidationError` maps to 400 `{ error: message }`, so the store throwing `ValidationError("invalid tag")` yields the required body without a new route branch.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title, URL, duplicate URL, then builds the bookmark. Tag validation runs before the insert so a rejected request stores nothing.
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with an `<a>` (title) and a Remove `<button>`; the tags element goes between them. `index.html` styles `li` as `display: flex; justify-content: space-between`, so a tags element between link and button may need a small style so it sits after the title rather than centered; keep it minimal for the bundle size.
  - `packages/web/src/main.ts`: fetches `/bookmarks` and posts the Add form as `{ title, url }`; is unchanged (Q1: no tags input).
- Tests: Vitest in each package (`pnpm --filter @sample/<pkg> test`); web tests use jsdom. `app.test.ts` shares one server across tests, so new API tests use URLs that do not collide with the existing `https://example.com/a` and `/b`.
- Existing web fixtures construct `Bookmark` objects without `tags`; making `tags` required on `Bookmark` makes them fail type-check until updated (covered by the web task).
- Change intent: every pull request that changes a package adds a changeset in `.changeset/`; Delivery (`fiji-deliver-change`) writes it, with summary "Add tags to bookmarks".
- Commits: Conventional Commits (`feat:`/`test:`/`chore:`), one logical change per commit, per AGENTS.md.

## Testing Strategy

- Unit (`packages/shared`): `normalizeTags` happy path (trim, lower-case, dedup with first-occurrence order), default `[]` for a missing value, boundary 32 accepted / 33 rejected (code points), internal whitespace rejected, empty and whitespace-only rejected, non-array and non-string element rejected.
- Integration (`packages/api`, real `http` server on an ephemeral port): POST with tags → 201 and normalized tags; POST without tags → `tags: []`; POST with an invalid tag (too long, whitespace, empty, non-array, non-string element) → 400 `{"error":"invalid tag"}` and `GET /bookmarks` unchanged; GET returns `tags` on each bookmark.
- Unit (`packages/web`, jsdom): tags text after the title joined with `", "`; nothing rendered for empty tags; existing empty-state and Remove tests still pass.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root (the CI `test`, `lint`, and `typecheck` jobs run the same on the pull request).
- Release: `pnpm build` then `pnpm measure`; `measure/baseline.json` updated to the new gzipped size in the same change.
- No migration (the store is in memory), no design source, and no manual or live-app check is planned: the issue asks for unit tests, and AC 6 is measured by the jsdom render test.

## Operational Requirements

- Required status check `test` (GitHub Actions app, integration 15368) must pass before merge to `main` — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api --method GET repos/panz3r/fijih-sample/rules/branches/main` → `required_status_checks: [{"context":"test","integration_id":15368}]`, `strict_required_status_checks_policy: false`; owner: repository admin `panz3r`.
- One approving review, squash merge only — where: repository ruleset `main` (id 26033321); evidence: same call → `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: repository admin `panz3r`. The approval comes from the QA Engineer `duckyduff369` (TEAMS.md).
- No classic branch protection on `main` — where: GitHub branch protection; evidence: `gh api --method GET repos/panz3r/fijih-sample/branches/main/protection` → 404 "Branch not protected"; owner: repository admin `panz3r`.
- The `ci` workflow's `test` job waits `vars.CI_DELAY_SECONDS` before running — where: repository Actions variable `CI_DELAY_SECONDS`; evidence: `gh api --method GET repos/panz3r/fijih-sample/actions/variables` → `CI_DELAY_SECONDS = "0"`; owner: repository admin `panz3r`.
- No writes to systems outside the repository (other than Jira and GitHub) are planned. This change adds, removes, or renames no CI check contexts.

### Defaults taken at plan approval

- Whitespace definition — a tag "contains whitespace" when it matches the JavaScript `\s` class after trimming, and trimming uses `String.prototype.trim`.
- `tags: null` — treated as a non-array value, so it answers 400 `{"error":"invalid tag"}`; only an absent `tags` defaults to `[]`.
- Validation order — every tag is validated before deduplication, so an invalid tag is rejected even when a duplicate precedes it.
- Length check — measured on the trimmed value before lower-casing.

## File List
- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- _plans/fiji-work-items/FIJIH-83.md
- packages/api/src/app.ts
- packages/api/src/store.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- packages/web/index.html
- measure/baseline.json

## Implementation Record
Task 1 — shared tag normalization and validation
(commit 18ac643)
- Added `tags` to `Bookmark`, optional `tags` to `NewBookmark`, `InvalidTagError`, and `normalizeTags` (validate every tag, then trim/lower-case/dedupe via Set, code-point length).
- shared test 10 passed, typecheck and lint clean.
Task 2 — API accepts and returns tags
(commit 7368cab)
- `app.ts` passes `body.tags` to the store; `store.ts` normalizes before any insert and maps InvalidTagError to `ValidationError("invalid tag")`.
- api test 15 passed (new cases in app.test.ts covering create, default, boundary, 8 invalid shapes with list unchanged), typecheck and lint clean.
Task 3 — web page shows tags
(commit 1a115a8)
- `render.ts` appends a `span.tags` after the title link only when `tags` is non-empty; `index.html` gets a one-line `.tags` rule so it sits after the title; fixtures updated.
- web test 4 passed, typecheck and lint clean.
Task 4 — repository checks from the root
(checked at 1a115a8)
- `pnpm test` exit 0 (shared 10, api 15, web 4 tests), `pnpm lint` clean, `pnpm typecheck` clean in all three packages.

Task 5 — bundle baseline moved to the measured size
(commit 8983579)
- `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=46`; baseline.json updated from 835 to 881; re-run printed `web_bundle_gzip_delta=0`.
Stale-statement sweep — Bookmark, NewBookmark, normalizeTags, InvalidTagError, "invalid tag", POST /bookmarks, GET /bookmarks, web_bundle_gzip_bytes, .tags
- none found (README and AGENTS.md hold no statement the change makes untrue; scenarios and work items are records).

## Validation Evidence
AC-1: passed — shared normalizeTags tests and api "stores normalized tags" test (["Work"," work ","Read"] -> ["work","read"]).
AC-2: passed — api "defaults tags to an empty array" test.
AC-3: passed — shared boundary/whitespace/empty tests; api 32-char accepted, too-long, whitespace, empty, whitespace-only return 400 {"error":"invalid tag"} with list unchanged.
AC-4: passed — api tests for non-array, number, null, non-string element return 400 {"error":"invalid tag"} with list unchanged.
AC-5: passed — api GET /bookmarks test reads tags back.
AC-6: passed — web render tests: "work, read" after the title, no tag element when empty.
AC-7: passed — pnpm test, pnpm lint, pnpm typecheck exit 0 from the root.
AC-8: passed — pnpm build then pnpm measure prints web_bundle_gzip_bytes=881, web_bundle_gzip_delta=0.

## Quality Gate

Gate: pass

Acceptance trace (main 8d4f0ec...42c76f1; root checks re-run at 42c76f1: `pnpm test` exit 0 with shared 10, api 15, web 4 passed; `pnpm lint` exit 0 with no findings; `pnpm typecheck` exit 0 in shared, api, web; `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0`):
- AC-1: implementation `normalizeTags` in `packages/shared/src/index.ts` (trim, lower-case, `Set` dedup keeps first-occurrence order) called from `BookmarkStore.add` in `packages/api/src/store.ts`; `app.ts` passes `body.tags`. Verification: shared "trims, lower-cases, and deduplicates keeping first occurrence order"; api "stores normalized tags and returns them on GET" (`["Work"," work ","Read"]` -> 201 `["work","read"]`).
- AC-2: implementation `normalizeTags(undefined)` returns `[]`. Verification: shared "defaults a missing value to an empty array"; api "defaults tags to an empty array".
- AC-3: implementation trimmed value rejected when empty, `Array.from(trimmed).length > 32`, or `/\s/`; `InvalidTagError` mapped to `ValidationError("invalid tag")` before the insert. Verification: shared 32/33 boundary (ASCII and emoji), whitespace, empty, whitespace-only; api "accepts a 32 character tag and a padded tag" and `rejects an invalid tag` cases too long, whitespace, empty, whitespace only, each 400 `{"error":"invalid tag"}` with `GET /bookmarks` unchanged.
- AC-4: implementation non-array (including `null`) and non-string element throw `InvalidTagError`. Verification: shared "rejects a non-array value, null, and a non-string element"; api cases not an array, a number, null, non-string element, each 400 `{"error":"invalid tag"}` with the list unchanged.
- AC-5: implementation `tags` stored on the `Bookmark`, `store.list()` returns it. Verification: api "stores normalized tags and returns them on GET".
- AC-6: implementation `renderList` in `packages/web/src/render.ts` appends `span.tags` with `tags.join(", ")` after the link only when non-empty; `.tags` margin rule in `packages/web/index.html` keeps it next to the title. Verification: web "shows tags after the title joined with a comma and a space" (link's next sibling is `work, read`); "renders no tag element or text when tags is empty" (no `.tags`, item text `ExampleRemove`).
- AC-7: Vitest tests added in all three packages for AC 1-6; `pnpm test`, `pnpm lint`, `pnpm typecheck` exit 0 from the root at 42c76f1.
- AC-8: `measure/baseline.json` `web_bundle_gzip_bytes` 835 -> 881 (8983579); `pnpm measure` at 42c76f1 prints `web_bundle_gzip_delta=0`.

Product decisions checked against the criteria (Q1 no tags input, Q2 a-d, Q3, defaults for whitespace, `null`, validation order, length before lower-casing): none contradicts a criterion.

Findings: none.

Residual risks: none.

Stale-statement sweep (`Bookmark`, `NewBookmark`, `normalizeTags`, `InvalidTagError`, `invalid tag`, `POST /bookmarks`, `GET /bookmarks`, `tags`, `web_bundle_gzip_bytes`, `835` across README.md, AGENTS.md, scenarios/, packages/, code comments and test names): no statement the change makes untrue.

Reviewed head: 42c76f1fb8d204db0c59bace04433be7dc1c3212

## Review Record

## Change Log
- 2026-11-03 — Plan approval request (targeted repair, attempt 1): "Approve. Answers: Q1 no tags input. Q2 a yes, b reject with 400 invalid tag, c yes, d yes. Q3 yes to both." Applied: recorded Q1–Q3 decisions in Product Context; AC 3 now includes empty tags and code-point counting; new AC 4 for non-array and non-string values (AC 4–7 renumbered to 5–8); removed the conditional tags-input task; updated tasks and Testing Strategy; added defaults.
- 2026-11-03 — Approved: plan-approval — Approve this plan.
- 2026-11-03 — Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-03 — Local QA finalize: all tasks and AC 1–8 have committed evidence; added `(commit <hash>)` citations to the Implementation Record entries of Tasks 1–3 (routine reconciliation); File List already covers every branch file change; no task/evidence discrepancies. Checkpoint local-qa-review, transition qa-reviewed.
