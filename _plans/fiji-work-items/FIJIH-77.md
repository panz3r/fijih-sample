---
schema: fiji/work-item/v1
id: FIJIH-77
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-77
  revision: 2026-11-03T13:00:33.932+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
  attempt: 2
quality:
  gate: fail
artifacts:
  branch: FIJIH-77-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-77: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want each bookmark to carry an optional list of tags that the API accepts and returns and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

- Source: Jira story FIJIH-77 "Add tags to bookmarks" (project FIJIH, label `scenario-S1`, priority Medium), read at revision `2026-11-03T13:00:33.932+0100` after assigning it to the current user. No comments, attachments, issue links, or Figma URLs.
- Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue decisions, quoted: "Tags are not filterable yet."
- Out of scope per the issue: "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- Decided at `plan-approval` (see Engineering Context, Decisions taken at plan approval): no tags input on the add-bookmark form (out of scope, per the user's answer), `400 {"error":"invalid tag"}` for a `tags` value of the wrong shape and for an empty tag after trimming, length counted in Unicode code points on the trimmed tag, and the separator `", "`.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after that normalisation) are removed, keeping the first occurrence's position. When `tags` is omitted the bookmark gets `tags: []`. The `201` response body includes the stored `tags`.
2. `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing (a following `GET /bookmarks` does not list it) when: `tags` is present but not an array; an element is not a string; a tag is empty after trimming; a trimmed tag is longer than 32 Unicode code points (so `"é"` counts as 1); or a trimmed tag contains whitespace. A tag of exactly 32 code points is accepted.
3. `GET /bookmarks` returns the `tags` array of each bookmark (an empty array for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, separated by `", "` (for example `news, tech`), and shows no tag text and no separator for a bookmark whose `tags` is empty.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. `measure/baseline.json` records the gzipped web bundle size this change produces: after `pnpm build`, `pnpm measure` prints `web_bundle_gzip_delta=0` (AGENTS.md: a pull request that knowingly moves the bundle updates the baseline in the same change).

## Tasks and Subtasks

- [x] 1. `packages/shared`: add tags to the shared model and a pure tag normaliser (AC: 1, 2, 5)
  - [ ] 1.1 Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` to `NewBookmark` (validated by `parseTags`). The tags input on the add-bookmark form is out of scope: `packages/web/index.html` and `packages/web/src/main.ts` stay unchanged.
  - [ ] 1.2 Add an exported pure function (for example `normalizeTags`) that trims, lower-cases, and deduplicates tags in first-occurrence order, and an exported predicate (for example `isValidTag`) that rejects a normalised tag that is empty, longer than 32 Unicode code points (counted with `[...tag].length`, not `.length`), or containing whitespace. Add an exported function (for example `parseTags(input: unknown)`) that returns the normalised tags, or `null` when `input` is present but not an array or has a non-string element or an invalid tag.
  - [ ] 1.3 Vitest tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case and surrounding whitespace, order kept, empty input gives `[]`, a 32-character tag accepted, a 33-character tag, an empty or whitespace-only tag, and a tag with inner whitespace (space, tab) rejected, a tag of 32 code points that is longer than 32 UTF-16 units (for example one containing an astral character) accepted, and `parseTags` returning `null` for a string, `null`, and an array with a non-string element.
- [x] 2. `packages/api` store: validate, normalise, and store tags (AC: 1, 2, 3, 5)
  - [ ] 2.1 In `BookmarkStore.add`, validate and normalise `input.tags` (typed `unknown`, default `[]`) through the shared helpers, throw `ValidationError("invalid tag")` when `tags` is not an array, an element is not a string, or any tag is invalid or empty, and store `tags` on the bookmark; run the tag check after the existing title and URL checks so their errors are unchanged.
  - [ ] 2.2 Vitest tests in `packages/api/src/store.test.ts`: tags stored normalised, default `[]`, invalid tag, empty tag, non-array `tags`, and non-string element each throw `ValidationError` with message `invalid tag` and leave the store unchanged.
- [x] 3. `packages/api` HTTP: accept and return tags (AC: 1, 2, 3, 5)
  - [ ] 3.1 In `createApp`, pass the request body's `tags` to `store.add`; `GET /bookmarks` returns them through `store.list()`.
  - [ ] 3.2 Vitest tests in `packages/api/src/app.test.ts`: `POST` with mixed-case, padded, duplicate tags returns `201` with normalised tags; `POST` without `tags` returns `tags: []`; `POST` with a 33-character tag, a tag containing whitespace, an empty or whitespace-only tag, `tags` as a string or `null`, and an array with a non-string element each return `400` `{"error":"invalid tag"}` and the bookmark is not listed afterwards; `GET /bookmarks` returns each bookmark's tags.
- [x] 4. `packages/web`: show tags after the title (AC: 4, 5)
  - [ ] 4.1 In `renderList` (`packages/web/src/render.ts`), when a bookmark has tags, render them after the title link, joined by `", "`, as text content (never as HTML); render nothing extra when `tags` is empty.
  - [ ] 4.2 Vitest tests in `packages/web/src/render.test.ts`: a bookmark with tags shows `news, tech` after its title; a bookmark with `tags: []` shows no tag text or separator; the existing fixtures gain `tags`.
- [x] 5. Bundle baseline: run `pnpm build` then `pnpm measure`, and when the delta is not 0 set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed size, then re-run `pnpm measure` to confirm `web_bundle_gzip_delta=0` (AC: 6)
- [x] 6. Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results (AC: 5)
- [x] 7. Remediate Quality Gate finding F1 (`blocking`, Re-entry 2): count the 32-code-point limit on the trimmed tag, not the lower-cased tag, in `packages/shared`, add a shared and an API test for a tag whose length changes under lower-casing (`"İ".repeat(32)`), and correct the Engineering Context approach line (AC: 2, 5)

## Engineering Context

- Repository: pnpm workspace. `packages/shared` (types and pure functions, imported from source by the other two), `packages/api` (Node `http` service, in-memory `BookmarkStore`), `packages/web` (Vite + vanilla TypeScript page). Vitest in every package; ESLint and `tsc` type-check from the root.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, URL helpers, `sortByCreatedDesc`. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` is optional on input but always present on `Bookmark`.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title then URL then duplicate URL, throwing `ValidationError`; `list()` returns stored bookmarks sorted newest first.
  - `packages/api/src/app.ts`: `POST /bookmarks` casts the body to `{ url?: string; title?: string }`; `ValidationError` maps to `400 {"error": message}`, a JSON `SyntaxError` to `400 {"error":"invalid json"}`, anything else to `500`. The body type gains `tags?: unknown`; malformed `tags` answers `400 {"error":"invalid tag"}` and must not reach the `500` path.
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with the title `<a>` and a Remove `<button>`; `packages/web/index.html` styles `li` as a flex row with `space-between`. Tags go in an element between the link and the button, set through `textContent`.
  - `packages/web/src/main.ts`: fetches `/bookmarks` and posts `{ title, url }` from the form; it needs no change (the tags input is out of scope).
- Approach: normalisation and validation live in `packages/shared` as pure functions (the README describes shared as the home of validation and normalisation helpers); the store owns the `ValidationError`; the HTTP layer only passes the body through. Order of normalisation: trim, validate, lower-case, deduplicate keeping first occurrence. "Whitespace" is any character matched by `\s`. Length is checked on the trimmed tag (before lower-casing), in Unicode code points.
- Storage is in memory only, so there is no data migration; existing bookmarks do not survive a restart.
- Change intent: the pull request changes packages, so it needs a changeset in `.changeset/` whose summary is the pull request title without the Jira key ("Add tags to bookmarks"); Delivery adds it per AGENTS.md.
- No design source (no Figma URL in the issue).

### Decisions taken at plan approval

User's answers at `plan-approval`, applied above:

1. No tags input on the add-bookmark form (out of scope).
2. A non-array `tags`, or a non-string element, answers `400 {"error":"invalid tag"}`.
3. A tag empty after trimming answers `400 {"error":"invalid tag"}`.
4. The 32-character limit is counted on the trimmed tag, in Unicode code points.
5. The page separator is `", "`.

### Defaults taken at plan approval

- Order of the new checks in `BookmarkStore.add` — the wrong-shape and empty-tag checks run with the other tag checks, after the title and URL checks, so existing error messages are unchanged.

## Testing Strategy

- Unit (`packages/shared`, Vitest): normaliser and validator, happy paths (trim, lower-case, dedupe, order, default) and unhappy paths (33 characters, inner space and tab), plus the 32-character boundary.
- Unit (`packages/api` store, Vitest): stored tags, default `[]`, `ValidationError("invalid tag")` with no side effect.
- Integration (`packages/api` HTTP, Vitest against `createApp()` on an ephemeral port): `POST` with and without tags, invalid tags (too long, whitespace, empty, wrong shape) answering `400 {"error":"invalid tag"}` with nothing stored, `GET` returning tags. Existing tests keep passing (existing error messages unchanged).
- Unit (`packages/web`, Vitest DOM): tags rendered after the title with `", "`; nothing rendered for empty tags; existing empty-state and Remove tests still pass.
- Bundle: `pnpm build` then `pnpm measure` locally; baseline updated in the same change (Task 5). CI's `measure` job reports the same value but never fails, so no criterion depends on CI.
- Repository checks from the root before every commit: `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- No manual, live-app, or end-to-end check is planned; every criterion is covered by the Vitest suites and the local measure run.

## Operational Requirements

- Merging into `main` requires the `test` status check (job `test` of `.github/workflows/ci.yml`, triggered on `pull_request`) — where: repository ruleset `main` (id 26033321) on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with `[{"context":"test","integration_id":15368}]`, `strict_required_status_checks_policy: false`; owner: administrators of panz3r/fijih-sample (owner account `panz3r`).
- Merging into `main` requires one approving review and allows only squash merges — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: administrators of panz3r/fijih-sample (owner account `panz3r`). Per TEAMS.md and AGENTS.md the approval comes from the QA Engineer `duckyduff369`.
- The change adds, removes, or renames no CI check context, and needs no environment, secret, deploy configuration, or other repository.

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
- README.md

## Implementation Record

Task 1 — shared tag model and normaliser: `Bookmark.tags`, `NewBookmark.tags?: unknown`, `normalizeTags`, `isValidTag` (code-point length via `[...tag].length`, `\s` whitespace), `parseTags`; 8 new shared tests pass.

Task 2 — store validates and stores tags: `BookmarkStore.add` runs the tag check after the title and URL checks and throws `ValidationError("invalid tag")`; store tests cover normalised storage, default `[]`, invalid and wrong-shaped tags with the store unchanged.

Task 3 — HTTP accepts and returns tags: `createApp` passes `body.tags` to `store.add`; app tests cover normalised create, default `[]`, eight invalid cases answering `400 {"error":"invalid tag"}` with nothing listed, and `GET` returning tags.

Task 4 — web shows tags after the title: `renderList` appends a `<span>` with `tags.join(", ")` as text content only when tags exist; render tests cover `news, tech` and the empty case; the existing fixture gains `tags`.

Task 5 — bundle baseline: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=871`, `web_bundle_gzip_delta=36` against 835; `measure/baseline.json` set to 871 and `pnpm measure` re-run printed `web_bundle_gzip_delta=0`.

Stale-statement sweep — `Bookmark`, `NewBookmark`, `normalizeUrl`/`isValidBookmarkUrl`, `POST /bookmarks`, `createdAt`, "validation and normalisation", `ValidationError` messages, `measure/baseline.json`.
- Corrected: README.md (shared package description now names tag validation and normalisation).
- Skipped: none; AGENTS.md and TEAMS.md hold no statement the change makes untrue.

Task 7 — F1: 32-code-point limit counted on the trimmed tag: `parseTags` now trims, validates with `isValidTag`, then lower-cases and deduplicates; added a shared test (`"İ".repeat(32)` accepted, with or without padding, 33 rejected) and an API test (`POST` with that tag answers `201` with the lower-cased tag); Engineering Context approach line corrected.
(commit a85b419)
`pnpm test` (shared 12, api 23, web 4), `pnpm lint`, `pnpm typecheck` clean; `pnpm build` then `pnpm measure` printed `web_bundle_gzip_delta=0` (baseline 871 unchanged).

Task 6 — repository checks
(checked at 78a3f4d)
`pnpm test`: shared 11, api 22, web 4 tests passed. `pnpm lint`: clean. `pnpm typecheck`: clean.

Stale-statement sweep — `parseTags`, `isValidTag`, "lower-cased", "code point", "32 characters" (diff since acf696e).
- Corrected: none found (the Engineering Context approach line is corrected in Task 7; `scenarios/S1.md` and README.md hold no statement the change makes untrue).

## Validation Evidence

- AC-1: passed — shared `normalizeTags`/`parseTags` tests, store tests, and app test "normalises tags on create" and "defaults tags to []".
- AC-2: passed — shared `parseTags` test for 32 `İ` (lower-case form longer) accepted, app test answering `201`; shared `isValidTag`/`parseTags` tests (33 chars, whitespace, empty, astral 32 code points accepted), store and app invalid-tag tests (400 `{"error":"invalid tag"}`, nothing listed).
- AC-3: passed — app test lists tags for tagged and untagged bookmarks.
- AC-4: passed — web render tests ("news, tech" after the title; no tag text for empty tags).
- AC-5: passed — `pnpm test` (shared 12, api 23, web 4), `pnpm lint`, `pnpm typecheck` from the root after Task 7.
- AC-6: passed — `pnpm build` then `pnpm measure` printed `web_bundle_gzip_delta=0` with baseline 871 (re-run after Task 7).

## Quality Gate

Gate: fail. AC-2 is unmet for one reproducible input (finding F1, `blocking`).

Reviewed head: acf696e550acf15f04a8533d7a2e9808deaef8f3

Acceptance trace:

- AC-1: met. Implementation: `normalizeTags` and `parseTags` (`packages/shared/src/index.ts:14`, `:24`), `BookmarkStore.add` storing `tags` with default `[]` (`packages/api/src/store.ts`), `createApp` passing `body.tags` (`packages/api/src/app.ts:23-24`). Verification: shared `normalizeTags`/`parseTags` tests, store test "stores normalised tags and defaults to []", app tests "normalises tags on create and returns them on list" and "defaults tags to [] when omitted".
- AC-2: unmet (F1). Implementation: `isValidTag` and `parseTags` (`packages/shared/src/index.ts:19`, `:24`), `ValidationError("invalid tag")` in `BookmarkStore.add`, mapped to `400` in `createApp`. Verification: shared `isValidTag`/`parseTags` tests, store and app invalid-tag tests (33 characters, space, tab, empty, whitespace-only, string, `null`, non-string element; `400 {"error":"invalid tag"}`, nothing listed). Wrong shapes, empty, whitespace, and the 33-character limit behave as specified; the length is measured on the lower-cased tag instead of the trimmed tag, so a 32-code-point tag is rejected when lower-casing lengthens it.
- AC-3: met. Implementation: `store.list()` returns stored `tags`. Verification: app tests list `["news","tech"]` and `[]`.
- AC-4: met. Implementation: `renderList` appends a `<span>` with `tags.join(", ")` as `textContent` only when `tags` is non-empty (`packages/web/src/render.ts`). Verification: render tests "shows tags after the title separated by a comma and space" and "shows no tag text for a bookmark without tags".
- AC-5: validations met — re-run at the reviewed head: `pnpm test` (shared 11, api 22, web 4 passed), `pnpm lint` clean, `pnpm typecheck` clean. Test coverage of AC-2 misses the case in F1.
- AC-6: met — re-run at the reviewed head: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=871`, `web_bundle_gzip_delta=0`.

Findings:

- F1 (`blocking`) — `packages/shared/src/index.ts:15-28`: `parseTags` lower-cases before `isValidTag` counts code points, so the 32-code-point limit is applied to the lower-cased tag, not the trimmed tag that AC-2 and the plan-approval decision 4 ("counted on the trimmed tag, in Unicode code points") name. Lower-casing U+0130 (`İ`) yields two code points (`i` + U+0307), so a trimmed tag of exactly 32 code points is rejected. Reproduced: `parseTags(["İ".repeat(32)])` returns `null`, and `POST /bookmarks` with `tags: ["İ".repeat(32)]` answers `400 {"error":"invalid tag"}` (AC-2: "A tag of exactly 32 code points is accepted"). The Engineering Context approach line ("Length is checked on the trimmed, lower-cased tag", `_plans/fiji-work-items/FIJIH-77.md:76`) records the same contradiction with AC-2. No test covers a tag whose length changes under lower-casing.

Residual risks: none.

Stale statements: none found. README.md's shared-package line was updated in this change; `scenarios/` notes describe other scenarios' features, not current behaviour.

Unmet required validations: none (test, lint, type-check, build, and measure passed at the reviewed head).

## Review Record

## Change Log

- 2026-11-03: Plan approved conditionally at `plan-approval` with the answers "Approve. Answers: 1. No form input. 2. Yes. 3. 400 invalid tag. 4. Yes. 5. Yes, \", \". Publish: yes. Notify: yes." Applied: AC 2 and 4, tasks 1-4, Product Context, and Engineering Context (open questions replaced by decisions).
- 2026-11-03: Approved: plan-approval — Approve. Answers: 1. No form input. 2. Yes. 3. 400 invalid tag. 4. Yes. 5. Yes, ", ".
- 2026-11-03: Approved: implementation-approval — automatic (no risk triggers)
- 2026-11-03: Quality gate recorded: fail (F1, AC-2 length measured after lower-casing) at acf696e.
- 2026-11-03: Re-entry 2: quality-fail — fe0c2ec09bfcdfbcf2e32dc42bb9217dd23ddfa5 (quality gate fail, F1: AC-2 length measured after lower-casing). Task 7 appended.
