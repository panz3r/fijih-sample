---
schema: fiji/work-item/v1
id: FIJIH-74
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-74
  revision: "2026-11-03T00:42:54.074+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-74-add-tags-to-bookmarks
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-74: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give a bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-74 (Story, Medium), https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-74. No comments, attachments, links, or Figma references.
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue decision: "Tags are not filterable yet."
- Out of scope (issue): filtering or searching by tag; editing tags of an existing bookmark.
- Out of scope (this plan, pending confirmation under Open product decisions): a tags input in the web page's Add form. The issue's criteria cover the API accepting tags and the page displaying them; they do not name a form input.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, duplicates are removed (first occurrence kept, in input order), and the created bookmark returned with `201` carries the resulting `tags`. When `tags` is omitted, the bookmark's `tags` is `[]`.
2. When any tag, after trimming, is longer than 32 characters or contains a whitespace character, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` when it has none).
4. The web page shows each bookmark's tags after its title as one comma-separated text (for example `work, reading`), and renders no tag text or element when the bookmark has no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in AC 1–4, including the unhappy paths of AC 2.
6. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root, and `measure/baseline.json` records the gzipped web bundle size that `pnpm build` then `pnpm measure` prints on this branch (AGENTS.md: a change that knowingly moves the bundle size updates the baseline).

## Tasks and Subtasks

- [x] Shared: add tags to the model and a pure normaliser (AC: 1, 2, 5)
  - [x] `packages/shared/src/index.ts`: add `tags: string[]` to `Bookmark`; make `NewBookmark` carry an optional `tags?: string[]` alongside `url` and `title`.
  - [x] Add an exported constant `MAX_TAG_LENGTH = 32` and a pure function (for example `normalizeTags(input: readonly string[]): string[] | null`, or a function that throws a typed error) that trims, lower-cases, deduplicates preserving first-occurrence order, and reports invalid when a trimmed tag is longer than 32 characters or contains whitespace (`/\s/`).
  - [x] `packages/shared/src/index.test.ts`: tests for trimming, lower-casing, dedup after case folding (`["A", "a", " a "]` → `["a"]`), order preservation, the 32-character boundary (32 valid, 33 invalid), inner whitespace (space, tab) invalid, and empty input → `[]`.
- [x] API: accept, validate, store, and return tags (AC: 1, 2, 3, 5)
  - [x] `packages/api/src/store.ts`: `BookmarkStore.add` normalises `input.tags ?? []` through the shared function and throws `ValidationError("invalid tag")` when it is invalid; the stored bookmark includes `tags`. Keep the existing title, URL, and duplicate-URL checks.
  - [x] `packages/api/src/app.ts`: pass `body.tags` from the parsed JSON to `store.add`; a `tags` value that is not an array of strings is handled per the Open product decisions answer.
  - [x] `packages/api/src/store.test.ts`: tests for default `[]`, normalisation, and `ValidationError("invalid tag")` on a 33-character tag and on an inner-whitespace tag, with nothing stored.
  - [x] `packages/api/src/app.test.ts`: HTTP tests that `POST` with tags returns `201` with normalised tags, `POST` without tags returns `tags: []`, an invalid tag returns `400 {"error":"invalid tag"}`, and `GET /bookmarks` returns each bookmark's tags.
- [x] Web: show tags after the title (AC: 4, 5)
  - [x] `packages/web/src/render.ts`: when `bookmark.tags.length > 0`, append after the title link an element (for example `<span class="tags">`) whose `textContent` is `tags.join(", ")`; append nothing when there are none. Use `textContent`, never `innerHTML`.
  - [x] `packages/web/src/render.test.ts`: update the existing fixture to carry `tags: []`; add tests that a bookmark with `["work", "reading"]` shows `work, reading` after the title and that a bookmark with no tags renders no tags element.
- [x] Update the bundle-size baseline and run the project checks (AC: 6)
  - [x] Run `pnpm build` then `pnpm measure`; write the printed `web_bundle_gzip_bytes` to `measure/baseline.json`.
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `@sample/api` and `@sample/web`.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. `NewBookmark` must change from a plain `Pick`, because `tags` is required on `Bookmark` but optional on input.
  - `packages/api/src/store.ts`: in-memory `BookmarkStore` (a `Map`); validation throws `ValidationError(message)`, which `app.ts` maps to `400 {"error": message}`. So `ValidationError("invalid tag")` produces the exact body AC 2 asks for.
  - `packages/api/src/app.ts`: `POST /bookmarks` currently reads only `url` and `title` from the body.
  - `packages/web/src/render.ts`: `renderList` builds each `<li>` as title link plus Remove button; `packages/web/index.html` styles `li` as `display: flex; justify-content: space-between`, so the tags element goes between the link and the button (inside the item, after the title).
  - `packages/web/src/main.ts`: fetches `GET /bookmarks` and posts the Add form; no change needed for AC 4.
- Validation interpretation: tags are trimmed before the length and whitespace checks, so leading or trailing whitespace is accepted and removed, and only inner whitespace is rejected; otherwise trimming would have no effect. Length is counted in UTF-16 code units (`string.length`).
- Storage is in memory with no persistence, so there is no data migration; every stored bookmark is created with `tags`.
- The README's API row (`GET/POST /bookmarks`, ...) lists endpoints, not fields; it needs no change.
- Conventions (AGENTS.md): Conventional Commits, one logical change per commit (suggested: `feat:` for shared, api, and web, or one per package; `chore:` for the baseline update); every behaviour change has a Vitest test in its package.
- Change intent: Delivery adds a changeset in `.changeset/` whose summary is "Add tags to bookmarks" (the pull request title `[FIJIH-74] Add tags to bookmarks` without the key). Pull request label: `enhancement` (issue type Story). Reviewers: the Bookmarks team in TEAMS.md; one approval from the QA Engineer `duckyduff369`.

### Open product decisions

Asked under the Plan result's risks; Implementation follows the answers.

1. Web Add form: is a tags input in scope? Proposed: no (the issue's page criterion covers display only).
2. A `tags` value that is not an array of strings (for example `"tags": "work"` or `"tags": [1]`): proposed `400 {"error":"invalid tag"}`.
3. A tag that is empty after trimming (for example `""` or `"  "`): proposed `400 {"error":"invalid tag"}` (alternative: drop it silently).
4. Display separator: proposed `", "` (comma and space), in a separate element after the title link.

## Testing Strategy

- Unit (Vitest, per package, as AGENTS.md requires):
  - `packages/shared`: the tag normaliser's happy paths (trim, lower-case, dedup, order, empty input) and unhappy paths (33 characters, inner space, inner tab, plus the answers to Open product decisions 2 and 3).
  - `packages/api`: `BookmarkStore` tests for the default and the error, and HTTP tests through `createApp` on an ephemeral port for `POST` with and without tags, the `400 {"error":"invalid tag"}` path, and `GET` returning tags.
  - `packages/web`: `renderList` in jsdom with and without tags.
- No manual, live-app, or end-to-end check is planned: the behaviour is covered by the unit tests, and the project has no e2e suite.
- Release checks: root `pnpm test`, `pnpm lint`, `pnpm typecheck`; `pnpm build` and `pnpm measure` for the baseline update (AC 6). CI's `test` job (required) runs the same tests on the pull request.

## Operational Requirements

- Required status check `test` on `main` — where: repository ruleset `main` (id 26033321, enforcement active), panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test` (integration_id 15368), produced by the `test` job of `.github/workflows/ci.yml`, which runs on `pull_request`; this change does not add, remove, or rename check contexts; owner: repository admin (panz3r).
- One approving review and squash-only merge on `main` — where: repository ruleset `main` (id 26033321); evidence: the same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (panz3r).
- No environments, secrets, deploy configuration, or other repositories are involved.

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

## Implementation Record

Task 1 — Shared: `tags` on `Bookmark`, optional on `NewBookmark`, `MAX_TAG_LENGTH = 32`, and `normalizeTags(input: unknown): string[] | null` (trim, lower-case, dedupe in order; null for non-array, non-string, empty-after-trim, over 32 characters, or inner whitespace, per the approved defaults for Open product decisions 2 and 3). 8 new unit tests.
shared: `pnpm --filter @sample/shared test` 12 passed.
Task 2 — API: `BookmarkStore.add` normalises `tags ?? []` and throws `ValidationError("invalid tag")`; `POST /bookmarks` passes `body.tags` through (non-array or invalid tags answer 400 `{"error":"invalid tag"}`); stored and listed bookmarks carry `tags`. Store tests and HTTP tests added.
api: `pnpm --filter @sample/api test` 16 passed.
Task 3 — Web: `renderList` appends `<span class="tags">` with `tags.join(", ")` (textContent) after the title link when a bookmark has tags, nothing otherwise; fixture updated and two tests added.
web: `pnpm --filter @sample/web test` 4 passed.
Task 4 — Baseline: `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=881` (was 835); `measure/baseline.json` updated to 881; re-running `pnpm measure` reports delta 0.
Root `pnpm test`, `pnpm lint`, `pnpm typecheck` all exit 0.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-03: Plan drafted from FIJIH-74 at revision 2026-11-03T00:42:54.074+0100; issue assigned to Mattia Panzeri.
- 2026-11-03: Approved: plan-approval — Approve with the proposed defaults. Publish: yes. Notify: yes.
