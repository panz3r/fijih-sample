---
schema: fiji/work-item/v1
id: FIJIH-77
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-77
  revision: 2026-11-03T13:00:33.932+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
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
- Not named by the issue and asked under Plan risks (see Engineering Context, Open questions): a tags input on the add-bookmark form, the response to a `tags` value of the wrong shape, an empty tag after trimming, and the exact separator on the page.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after that normalisation) are removed, keeping the first occurrence's position. When `tags` is omitted the bookmark gets `tags: []`. The `201` response body includes the stored `tags`.
2. When any tag, after trimming, is longer than 32 characters or contains whitespace, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing (a following `GET /bookmarks` does not list it). A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns the `tags` array of each bookmark (an empty array for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, comma separated (for example `news, tech`), and shows no tag text and no separator for a bookmark whose `tags` is empty.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. `measure/baseline.json` records the gzipped web bundle size this change produces: after `pnpm build`, `pnpm measure` prints `web_bundle_gzip_delta=0` (AGENTS.md: a pull request that knowingly moves the bundle updates the baseline in the same change).

## Tasks and Subtasks

- [ ] 1. `packages/shared`: add tags to the shared model and a pure tag normaliser (AC: 1, 2, 5)
  - [ ] 1.1 Add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [ ] 1.2 Add an exported pure function (for example `normalizeTags`) that trims, lower-cases, and deduplicates tags in first-occurrence order, and an exported predicate (for example `isValidTag`) that rejects a normalised tag longer than 32 characters or containing whitespace.
  - [ ] 1.3 Vitest tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case and surrounding whitespace, order kept, empty input gives `[]`, a 32-character tag accepted, a 33-character tag and a tag with inner whitespace (space, tab) rejected.
- [ ] 2. `packages/api` store: validate, normalise, and store tags (AC: 1, 2, 3, 5)
  - [ ] 2.1 In `BookmarkStore.add`, normalise `input.tags` (default `[]`), throw `ValidationError("invalid tag")` when any tag is invalid, and store `tags` on the bookmark; run the tag check after the existing title and URL checks so their errors are unchanged.
  - [ ] 2.2 Vitest tests in `packages/api/src/store.test.ts`: tags stored normalised, default `[]`, invalid tag throws `ValidationError` with message `invalid tag` and leaves the store unchanged.
- [ ] 3. `packages/api` HTTP: accept and return tags (AC: 1, 2, 3, 5)
  - [ ] 3.1 In `createApp`, pass the request body's `tags` to `store.add`; `GET /bookmarks` returns them through `store.list()`.
  - [ ] 3.2 Vitest tests in `packages/api/src/app.test.ts`: `POST` with mixed-case, padded, duplicate tags returns `201` with normalised tags; `POST` without `tags` returns `tags: []`; `POST` with a 33-character tag and with a tag containing whitespace each return `400` `{"error":"invalid tag"}` and the bookmark is not listed afterwards; `GET /bookmarks` returns each bookmark's tags.
- [ ] 4. `packages/web`: show tags after the title (AC: 4, 5)
  - [ ] 4.1 In `renderList` (`packages/web/src/render.ts`), when a bookmark has tags, render them after the title link, joined by `, `, as text content (never as HTML); render nothing extra when `tags` is empty.
  - [ ] 4.2 Vitest tests in `packages/web/src/render.test.ts`: a bookmark with tags shows `news, tech` after its title; a bookmark with `tags: []` shows no tag text or separator; the existing fixtures gain `tags`.
- [ ] 5. Bundle baseline: run `pnpm build` then `pnpm measure`, and when the delta is not 0 set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed size, then re-run `pnpm measure` to confirm `web_bundle_gzip_delta=0` (AC: 6)
- [ ] 6. Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results (AC: 5)

## Engineering Context

- Repository: pnpm workspace. `packages/shared` (types and pure functions, imported from source by the other two), `packages/api` (Node `http` service, in-memory `BookmarkStore`), `packages/web` (Vite + vanilla TypeScript page). Vitest in every package; ESLint and `tsc` type-check from the root.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, URL helpers, `sortByCreatedDesc`. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` is optional on input but always present on `Bookmark`.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title then URL then duplicate URL, throwing `ValidationError`; `list()` returns stored bookmarks sorted newest first.
  - `packages/api/src/app.ts`: `POST /bookmarks` casts the body to `{ url?: string; title?: string }`; `ValidationError` maps to `400 {"error": message}`, a JSON `SyntaxError` to `400 {"error":"invalid json"}`, anything else to `500`. The body type gains `tags?: unknown`; malformed `tags` must not reach the `500` path (see Open questions).
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with the title `<a>` and a Remove `<button>`; `packages/web/index.html` styles `li` as a flex row with `space-between`. Tags go in an element between the link and the button, set through `textContent`.
  - `packages/web/src/main.ts`: fetches `/bookmarks` and posts `{ title, url }` from the form; it needs no change unless the form gains a tags input (Open questions).
- Approach: normalisation and validation live in `packages/shared` as pure functions (the README describes shared as the home of validation and normalisation helpers); the store owns the `ValidationError`; the HTTP layer only passes the body through. Order of normalisation: trim, lower-case, validate, deduplicate keeping first occurrence. "Whitespace" is any character matched by `\s`. Length is checked on the trimmed, lower-cased tag (see Open questions on how characters are counted).
- Storage is in memory only, so there is no data migration; existing bookmarks do not survive a restart.
- Change intent: the pull request changes packages, so it needs a changeset in `.changeset/` whose summary is the pull request title without the Jira key ("Add tags to bookmarks"); Delivery adds it per AGENTS.md.
- No design source (no Figma URL in the issue).

### Open questions

Asked under the Plan result's `risks`; the `plan-approval` decision settles them:

1. Add-bookmark form: the issue only asks the page to show tags. Is a tags input on the add form (`packages/web/index.html`, `packages/web/src/main.ts`) in scope? Without it, tags can only be set through the API.
2. Wrong-shaped `tags`: when `tags` is present but not an array (for example a string or `null`), or an element is not a string, should `POST /bookmarks` answer `400 {"error":"invalid tag"}`? (Proposed; the issue does not say.)
3. Empty tag: should a tag that is empty after trimming (`""` or `"   "`) answer `400 {"error":"invalid tag"}`, or be dropped silently?
4. Length rule: is the 32-character limit counted on the trimmed tag, in Unicode code points (so `"é"` counts as 1)? Proposed yes.
5. Separator: the page joins tags with `", "` (comma and space, for example `news, tech`). Confirm, or name another separator.

## Testing Strategy

- Unit (`packages/shared`, Vitest): normaliser and validator, happy paths (trim, lower-case, dedupe, order, default) and unhappy paths (33 characters, inner space and tab), plus the 32-character boundary.
- Unit (`packages/api` store, Vitest): stored tags, default `[]`, `ValidationError("invalid tag")` with no side effect.
- Integration (`packages/api` HTTP, Vitest against `createApp()` on an ephemeral port): `POST` with and without tags, invalid tags answering `400 {"error":"invalid tag"}` with nothing stored, `GET` returning tags. Existing tests keep passing (existing error messages unchanged).
- Unit (`packages/web`, Vitest DOM): tags rendered after the title with `", "`; nothing rendered for empty tags; existing empty-state and Remove tests still pass.
- Bundle: `pnpm build` then `pnpm measure` locally; baseline updated in the same change (Task 5). CI's `measure` job reports the same value but never fails, so no criterion depends on CI.
- Repository checks from the root before every commit: `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- No manual, live-app, or end-to-end check is planned; every criterion is covered by the Vitest suites and the local measure run.

## Operational Requirements

- Merging into `main` requires the `test` status check (job `test` of `.github/workflows/ci.yml`, triggered on `pull_request`) — where: repository ruleset `main` (id 26033321) on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with `[{"context":"test","integration_id":15368}]`, `strict_required_status_checks_policy: false`; owner: administrators of panz3r/fijih-sample (owner account `panz3r`).
- Merging into `main` requires one approving review and allows only squash merges — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: administrators of panz3r/fijih-sample (owner account `panz3r`). Per TEAMS.md and AGENTS.md the approval comes from the QA Engineer `duckyduff369`.
- The change adds, removes, or renames no CI check context, and needs no environment, secret, deploy configuration, or other repository.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log
