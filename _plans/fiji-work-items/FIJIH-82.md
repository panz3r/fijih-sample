---
schema: fiji/work-item/v1
id: FIJIH-82
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-82
  revision: 2026-11-03T17:09:49.462+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-82-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-82: Add tags to bookmarks

## Story

As a user of the bookmarks page,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira [FIJIH-82](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-82) (Story, priority Medium), "Add tags to bookmarks". It has no comments, attachments, or linked issues, and it references no Figma file.
- Context from the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision from the issue: "Tags are not filterable yet."
- Out of scope according to the issue: "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- Adjacent items the issue does not name. Each one is asked about under Open questions and is not planned until it is answered:
  - The add form in `packages/web/index.html` and `packages/web/src/main.ts` sends only `title` and `url`. The issue does not say whether the page gets a tags input. Without one, users can add tags only through the API.
  - `README.md` describes `packages/shared` as "URL validation and normalisation, sorting" and lists the API routes. It does not describe the shape of the request or response body.

### Open questions (product decisions for plan approval)

1. **Tags input on the add form.** Should the web add form get a tags field (for example, one comma-separated text input that sends `tags` in the POST body)? The current plan has no form change.
2. **Malformed `tags` values.** The issue defines only "longer than 32 characters" and "containing whitespace" as invalid. What should these inputs return: a non-array `tags` (for example `"a"` or `null`), an array element that is not a string (for example `1`), and a tag that is empty after trimming (`""` or `"   "`)? Proposal: each one returns 400 with `{"error":"invalid tag"}`.
3. **Order of the stored tags.** Proposal: after deduplication, keep the tags in the order of their first occurrence in the request.
4. **README.** Should `README.md` mention tags (the `packages/shared` description or the API row)? The current plan does not change it.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. The API trims each tag, lower-cases it, and removes duplicates. The response stores and returns the normalised tags. For example, `["  Work ", "work", "Read"]` becomes `["work", "read"]`. When the request has no `tags`, the bookmark has `tags: []`.
2. When any tag is longer than 32 characters after trimming, or contains whitespace after trimming, `POST /bookmarks` returns 400 with `{"error":"invalid tag"}` and does not store the bookmark. A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns the `tags` array of each bookmark. The array is `[]` for a bookmark created without tags.
4. On the web page, each bookmark that has tags shows them after its title, separated by `, ` (for example `work, read`). A bookmark with no tags shows no tag text and no separator.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 4. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value that `pnpm build && pnpm measure` prints on this branch, so `web_bundle_gzip_delta=0` (AGENTS.md: "a pull request that knowingly moves it updates `measure/baseline.json` in the same change").

## Tasks and Subtasks

- [ ] Add tag types and pure tag functions to `packages/shared/src/index.ts` (AC: 1, 2)
  - [ ] Add `tags: string[]` to `Bookmark`. Change `NewBookmark` to `Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] }`.
  - [ ] Add `normalizeTags(tags: readonly string[]): string[]`. It trims each tag, lower-cases it, and removes duplicates while it keeps the first occurrence.
  - [ ] Add `isValidTag(tag: string): boolean`. It is true when the normalised tag has 32 characters or fewer and does not match `/\s/`. Apply the answer to Open question 2 for empty tags.
  - [ ] Add tests to `packages/shared/src/index.test.ts`: trimming, lower-casing, removing duplicates while keeping order, and the boundaries at 32 and 33 characters. Also test internal whitespace (space, tab, and newline) and an empty input array.
- [ ] Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3)
  - [ ] `app.ts`: pass the `tags` value from the body to `store.add` without changing it, so that the store validates it.
  - [ ] `store.ts`: `add` sets `tags` to `[]` when the value is `undefined`. It throws `ValidationError("invalid tag")` when a tag is invalid after normalisation, and also for the malformed inputs in the answer to Open question 2. It stores `normalizeTags(...)` on the bookmark. Put the tag check after the URL validity check and before the duplicate-URL check.
  - [ ] `app.test.ts`: add these tests through the real HTTP server:
    - A POST with mixed-case, padded, and duplicate tags returns 201 with the normalised `tags`.
    - A POST without `tags` returns `tags: []`.
    - A tag of 33 characters returns 400 `{"error":"invalid tag"}`, and so does a tag with internal whitespace. In both cases, a later GET does not list the bookmark.
    - GET returns the `tags` of each bookmark.
  - [ ] `store.test.ts`: test the default `[]` and that a rejected tag stores nothing.
- [ ] Render tags on the web page in `packages/web` (AC: 4)
  - [ ] `render.ts`: when `bookmark.tags.length > 0`, append an element with class `tags` and the text `bookmark.tags.join(", ")` right after the title link. Put the link and the tags in one wrapper so that the `li` flex layout keeps the Remove button on the right. When there are no tags, append nothing.
  - [ ] `index.html`: add a small style for `.tags` (a left margin and a muted colour) so that the tags are visually separate from the title.
  - [ ] `render.test.ts`: add `tags` to the existing fixture. Add a test that two tags render as `a, b` after the link, and a test that `tags: []` renders no `.tags` element and no extra text.
  - [ ] If the answer to Open question 1 adds a form field: add the input to `index.html`, send `tags` from `main.ts`, and add a test for how the input is parsed.
- [ ] Update the bundle baseline (AC: 6)
  - [ ] Run `pnpm build` then `pnpm measure`. Write the printed `web_bundle_gzip_bytes` into `measure/baseline.json`.
- [ ] Run the checks from the repository root: `pnpm test`, `pnpm lint`, and `pnpm typecheck` (AC: 5)

## Engineering Context

- Layout (AGENTS.md): this is a pnpm workspace. `packages/shared` holds the types and pure functions, and the other two packages import it from source (`"exports": { ".": "./src/index.ts" }`). `packages/api` is a Node `http` service with an in-memory `BookmarkStore`. `packages/web` is a Vite page with vanilla TypeScript, and its tests run under jsdom (`vite.config.ts` `test.environment: "jsdom"`).
- Controlling code:
  - `packages/shared/src/index.ts` (`Bookmark`, `NewBookmark`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`).
  - `packages/api/src/app.ts` (`POST /bookmarks` currently builds `{ url, title }` from the body, and `ValidationError` maps to 400 `{ error: message }`).
  - `packages/api/src/store.ts` (`add` validates the title and then the URL, and rejects duplicate URLs).
  - `packages/web/src/render.ts` (`renderList`).
- Existing error convention: the store throws `ValidationError` with the user-facing message, and `app.ts` returns `{ error: message }` with 400. `"invalid tag"` follows the same path. Invalid JSON is already handled separately (`"invalid json"`).
- Validation follows normalisation. The issue trims each tag and also rejects whitespace and lengths over 32. If validation ran before trimming, every padded tag would be rejected and the trimming would have no effect, so the length and whitespace checks apply to the trimmed, lower-cased tag.
- `Bookmark.tags` becomes required, so every `Bookmark` literal must include it, including the fixture in `packages/web/src/render.test.ts`. TypeScript (`pnpm typecheck`) reports any literal that is missed.
- Out of scope (from the issue): filtering or searching by tag, and editing the tags of an existing bookmark. No route other than `POST` and `GET /bookmarks` changes. `DELETE` is unaffected.
- Changes to the bundle size: the render change makes the web bundle slightly larger, so AC 6 updates the baseline in the same change.
- Delivery note (AGENTS.md): the pull request needs a changeset in `.changeset/` whose summary is "Add tags to bookmarks". The Delivery phase adds it.

## Testing Strategy

- Unit tests (Vitest) in each package changed, as AGENTS.md requires ("Every behaviour change comes with a Vitest test in the package it changes"):
  - `packages/shared`: `normalizeTags` and `isValidTag`. The happy path covers trimming, lower-casing, removing duplicates while keeping order, and the empty array. The unhappy path covers 33 characters and internal whitespace. The boundary tests use exactly 32 characters and a padded 32-character tag.
  - `packages/api`: integration tests through `createApp()` on an ephemeral port (`app.test.ts`) for `POST` with tags, `POST` without tags, `POST` with an invalid tag (400 `{"error":"invalid tag"}`, nothing stored), and `GET` returning the tags. Store-level tests are in `store.test.ts`.
  - `packages/web`: `renderList` under jsdom with tags (text `a, b` after the link) and without tags (no `.tags` element).
- Commands, from the repository root: `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Each package can also be run alone, for example `pnpm --filter @sample/api test`.
- Bundle: `pnpm build` then `pnpm measure` prints `web_bundle_gzip_bytes` and `web_bundle_gzip_delta` (AC 6).
- No migration is needed because the store is in memory. There is no design source and no manual or live-app check, because the issue asks for unit tests and every criterion is checked by the tests above.
- CI: the `ci` workflow runs `test`, `lint`, `typecheck`, and `measure` on every pull request. No criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) on `main`. Where: repository ruleset `main` (id 26033321, enforcement `active`). Evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with `[{"context":"test","integration_id":15368}]`. That job is defined in `.github/workflows/ci.yml` (`on: pull_request`), and this change keeps it. Owner: repository admin (`panz3r`).
- One approving review and the squash merge method on `main`. Where: repository ruleset `main` (id 26033321). Evidence: the same call returned the `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`. AGENTS.md and TEAMS.md say the approval comes from the QA Engineer `duckyduff369`. Owner: repository admin (`panz3r`).
- Branch protection is not configured. Evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected". The ruleset above holds all enforcement on `main`.
- The change adds, removes, and renames no CI check contexts. It needs no environments, secrets, deploy configuration, feature flags, or other repositories.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log
