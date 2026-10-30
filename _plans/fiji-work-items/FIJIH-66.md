---
schema: fiji/work-item/v1
id: FIJIH-66
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-66
  revision: "2026-10-30T17:23:35.882+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-66-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-66: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-66 "Add tags to bookmarks" (Story, Medium, label `scenario-S7`). No comments, attachments, or Figma links.
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision (from the issue): tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Decisions (from the user at plan approval):
  1. The web add form (`packages/web/index.html`, `packages/web/src/main.ts`) gets no tags input; the form is unchanged and tags can be set only through the API.
  2. A tag that is empty after trimming (`""` or `"   "`) is dropped silently; it does not make the request fail.
  3. A `tags` value that is not an array, or an element that is not a string, makes `POST /bookmarks` answer 400 `{"error":"invalid tag"}`.
  4. Confirmed as recorded in AC 1-2: the 32-character limit and the whitespace rule are checked after trimming, whitespace means any `/\s/` character, and dedupe keeps the first occurrence in input order.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, tags that are empty after trimming are dropped silently, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence in input order. When `tags` is omitted, the created bookmark has `tags: []`. The 201 response body includes the normalized `tags`.
2. A tag that, after trimming, is longer than 32 characters or contains any whitespace character makes `POST /bookmarks` answer 400 with body `{"error":"invalid tag"}`, and no bookmark is created. A tag of exactly 32 characters is accepted. A `tags` value that is not an array, or an array element that is not a string, also makes `POST /bookmarks` answer 400 with body `{"error":"invalid tag"}`, and no bookmark is created.
3. `GET /bookmarks` returns a `tags` array on every bookmark, holding the normalized tags it was created with (`[]` when none).
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`). When a bookmark has no tags, no tag text or tag element is rendered for it. A person confirms this in a real browser (manual check task below).
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour in AC 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Add tag support to `packages/shared` (AC: 1, 2, 3, 5)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags?: string[]` to `NewBookmark`.
  - [x] Add a pure `normalizeTags(tags: readonly string[]): string[]` that trims, lower-cases, drops tags empty after trimming, and deduplicates keeping first-occurrence order.
  - [x] Add a pure `isValidTag(tag: string): boolean` (after trimming: length ≤ 32 and no whitespace character, per `/\s/`).
  - [x] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, empty-after-trim tags dropped, dedupe after normalization, order preserved, 32 vs 33 characters, inner space and tab rejected.
- [x] Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 5)
  - [x] `store.ts`: `BookmarkStore.add` validates each tag (throw `ValidationError("invalid tag")` for a non-array `tags`, a non-string element, a tag over 32 characters, or a tag with whitespace; an empty-after-trim tag is not an error), stores `normalizeTags(input.tags ?? [])` on the bookmark; validation happens before any insert.
  - [x] `app.ts`: pass `body.tags` through from the POST body unchanged (absent stays `undefined` so the store defaults it to `[]`), so a non-array or non-string value reaches the store validation and yields 400 `{"error":"invalid tag"}` (decision 3).
  - [x] `store.test.ts`: default `[]`, normalization, empty-after-trim tags (`""`, `"   "`) dropped without error, invalid tag (too long, whitespace, non-string element, non-array `tags`) throws and nothing is stored.
  - [x] `app.test.ts`: POST with tags returns normalized tags (201); POST without tags returns `tags: []`; POST with `tags: ["", "  ", "News"]` returns `["news"]` (201); POST with a 33-character tag, a tag containing whitespace, `tags: "news"` (not an array), and `tags: [1]` (non-string element) answers 400 `{"error":"invalid tag"}` and the list is unchanged; GET returns each bookmark's tags.
- [x] Show tags in `packages/web` (AC: 4, 5)
  - [x] `render.ts`: after the title link, append an element (for example `<span class="tags">`) whose text is `tags.join(", ")`, only when the bookmark has at least one tag.
  - [x] `render.test.ts`: update existing fixtures with `tags`; add a test that a bookmark with `["news","tech"]` shows `news, tech` after the title, and one with `[]` renders no tag element or text.
- [ ] Manual real-browser check, run by the user (AC: 4) — a person (the user; no tool or agent runs it) opens the page in a real browser and confirms tags show after each title and nothing shows for a bookmark without tags. Implementation pauses and asks the user to run it, and records the user's reported result in Validation Evidence.
  - [ ] Start the API (`pnpm --filter @sample/api start`, port 3000) and the web page (`pnpm --filter @sample/web dev`, Vite proxies `/bookmarks` to the API); open the page Vite prints.
  - [ ] Because the form has no tags input, create the bookmarks through the API, for example `curl -X POST localhost:3000/bookmarks -H 'content-type: application/json' -d '{"url":"https://example.com/a","title":"A","tags":["news","tech"]}'`, and one with no `tags` (`https://example.com/b`, title `B`); reload the page.
  - [ ] Confirm bookmark A shows `news, tech` after its title and bookmark B shows no tag text or element. The bookmarks this check creates are throwaway data in the in-memory store.
- [ ] Run the repository checks and the bundle measurement (AC: 4, 5)
  - [ ] Run `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root and record results in Validation Evidence.
  - [ ] Run `pnpm build` then `pnpm measure`; if the gzipped web bundle moves from `measure/baseline.json` (835 bytes), update the baseline in this change (AGENTS.md).

## Engineering Context

- Workspace: pnpm; `packages/shared` (types and pure functions, imported from source), `packages/api` (Node `http` server, in-memory `BookmarkStore`), `packages/web` (Vite page, DOM rendering in `render.ts`, tested with Vitest + jsdom).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, URL helpers, `sortByCreatedDesc`.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates title and URL and throws `ValidationError`; `app.ts` maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` yields the required body without changing the error mapping.
  - `packages/api/src/app.ts` — POST handler currently picks only `url` and `title` from the body.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with an `<a>` (title) and a Remove `<button>`; `main.ts` fetches `/bookmarks` and calls `renderList`.
- Interpretation of the issue's rules: trimming happens before validation, so leading/trailing whitespace never fails the whitespace rule; the 32-character limit and the whitespace rule are checked on the trimmed tag. "Containing whitespace" means any character matching `/\s/`.
- Making `Bookmark.tags` required changes the shared type; web test fixtures and any object literal typed `Bookmark` must add `tags`.
- Duplicate URL detection is unchanged; a second POST with the same URL and different tags is still rejected with `url already bookmarked`.
- Conventions (AGENTS.md): branch `FIJIH-66-add-tags-to-bookmarks`; Conventional Commits (`feat:` for the change, `test:` where a commit only adds tests), one logical change per commit; a changeset in `.changeset/` with summary `Add tags to bookmarks` is added at Delivery.
- No new dependencies.

### Defaults taken at plan approval

- How the manual check gets its data — bookmarks are created with `curl` against the local API, since the form has no tags input (decision 1).
- Where the 400 for a non-array or non-string `tags` is raised — in `BookmarkStore.add` via `ValidationError("invalid tag")`, with `app.ts` passing the raw value through, so the existing error mapping yields the body.

## Testing Strategy

- Unit (shared): table-style tests for `normalizeTags` and `isValidTag` — happy path (mixed case, padding, duplicates), boundary (32 accepted, 33 rejected), unhappy (inner space, tab).
- Unit (api, store): default `[]`; normalized tags stored; an invalid tag throws `ValidationError("invalid tag")` and leaves the store unchanged.
- Integration (api, HTTP via `createApp` on an ephemeral port, as in `app.test.ts`): POST with and without tags, 400 responses with exact body `{"error":"invalid tag"}` for too-long and whitespace tags, GET returns tags.
- Unit (web, jsdom): tags rendered after the title as `news, tech`; nothing rendered for `[]`; existing Remove wiring still works.
- Regression: existing tests in all three packages keep passing.
- Manual real-browser check (AC 4), run by the user: open the page and confirm tags show after each title (`news, tech`) and nothing shows for a bookmark without tags. It is a task above; jsdom rendering tests complement it. No other manual or end-to-end checks are planned.
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`; bundle size via `pnpm build` and `pnpm measure`.

## Operational Requirements

- The `test` status check (GitHub Actions, integration 15368) must pass before merge — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test`, plus `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected" (no classic protection); owner: repository admins (`panz3r`).
- One approving review is required before merge — where: same ruleset; evidence: as above; owner: repository admins (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`.
- Manual real-browser check — no outside-repository writes are planned; it runs locally by the user and its data lives only in the local in-memory API store.
- The change adds, removes, or renames no CI check contexts.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/store.test.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts

## Implementation Record

Task 1 — shared tag support: `tags` on `Bookmark`/`NewBookmark`, `normalizeTags`, `isValidTag` with tests. `pnpm --filter @sample/shared test` 10 passed; shared typecheck passed.
Task 2 — API accepts, validates, stores, and returns tags (`ValidationError("invalid tag")` from `BookmarkStore.add`, raw `body.tags` passed through in `app.ts`). `pnpm --filter @sample/api test` 17 passed; api typecheck passed.
Task 3 — web renders tags after the title in `<span class="tags">`, only when non-empty. `pnpm --filter @sample/web test` 4 passed; web typecheck passed.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-30 — Plan drafted from Jira FIJIH-66 (revision 2026-10-30T17:23:35.882+0100); issue assigned to Mattia Panzeri.
- 2026-10-30 — Plan changes requested at plan-approval: "Request changes: add a manual real-browser check task (a person opens the page and confirms tags show after each title and nothing shows for a bookmark without tags), run by me. Answers: 1) no form input; 2) drop an empty-after-trim tag silently; 3) yes, 400 invalid tag; 4) confirmed as you read them." Applied: manual check task added (AC 4, Testing Strategy), decisions 1-4 recorded, AC 1-2 updated for the silent drop and non-array/non-string 400, defaults recorded.
- 2026-10-30 — Approved: plan-approval — Approve. Defer the manual real-browser check task now: I will run it myself before release. (answering: whether to defer or keep the planned manual real-browser check task (AC 4, run by the user))
