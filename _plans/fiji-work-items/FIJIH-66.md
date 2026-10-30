---
schema: fiji/work-item/v1
id: FIJIH-66
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-66
  revision: "2026-10-30T17:23:35.882+0100"
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
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
- Open product questions (asked under the Plan result's risks; not decided here):
  1. Whether the web add form (`packages/web/index.html`, `packages/web/src/main.ts`) gets a tags input. The issue only asks the page to show tags, so this plan does not change the form; without such an input, tags can be set only through the API.
  2. How to handle a tag that is empty after trimming (`""` or `"   "`): reject with 400 `{"error":"invalid tag"}`, or drop it silently.
  3. How to handle a `tags` value that is not an array, or an element that is not a string: this plan proposes 400 `{"error":"invalid tag"}`.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence in input order. When `tags` is omitted, the created bookmark has `tags: []`. The 201 response body includes the normalized `tags`.
2. A tag that, after trimming, is longer than 32 characters or contains any whitespace character makes `POST /bookmarks` answer 400 with body `{"error":"invalid tag"}`, and no bookmark is created. A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns a `tags` array on every bookmark, holding the normalized tags it was created with (`[]` when none).
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`). When a bookmark has no tags, no tag text or tag element is rendered for it.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour in AC 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [ ] Add tag support to `packages/shared` (AC: 1, 2, 3, 5)
  - [ ] Add `tags: string[]` to `Bookmark`, and an optional `tags?: string[]` to `NewBookmark`.
  - [ ] Add a pure `normalizeTags(tags: readonly string[]): string[]` that trims, lower-cases, and deduplicates keeping first-occurrence order.
  - [ ] Add a pure `isValidTag(tag: string): boolean` (after trimming: length ≤ 32 and no whitespace character, per `/\s/`).
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, dedupe after normalization, order preserved, 32 vs 33 characters, inner space and tab rejected.
- [ ] Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 5)
  - [ ] `store.ts`: `BookmarkStore.add` validates each tag (throw `ValidationError("invalid tag")`), stores `normalizeTags(input.tags ?? [])` on the bookmark; validation happens before any insert.
  - [ ] `app.ts`: pass `body.tags` through from the POST body (default `[]` when absent); apply the answer to Product Context question 3 for non-array or non-string values.
  - [ ] `store.test.ts`: default `[]`, normalization, invalid tag throws and nothing is stored.
  - [ ] `app.test.ts`: POST with tags returns normalized tags (201); POST without tags returns `tags: []`; POST with a 33-character tag and with a tag containing whitespace answers 400 `{"error":"invalid tag"}` and the list is unchanged; GET returns each bookmark's tags.
- [ ] Show tags in `packages/web` (AC: 4, 5)
  - [ ] `render.ts`: after the title link, append an element (for example `<span class="tags">`) whose text is `tags.join(", ")`, only when the bookmark has at least one tag.
  - [ ] `render.test.ts`: update existing fixtures with `tags`; add a test that a bookmark with `["news","tech"]` shows `news, tech` after the title, and one with `[]` renders no tag element or text.
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

## Testing Strategy

- Unit (shared): table-style tests for `normalizeTags` and `isValidTag` — happy path (mixed case, padding, duplicates), boundary (32 accepted, 33 rejected), unhappy (inner space, tab).
- Unit (api, store): default `[]`; normalized tags stored; an invalid tag throws `ValidationError("invalid tag")` and leaves the store unchanged.
- Integration (api, HTTP via `createApp` on an ephemeral port, as in `app.test.ts`): POST with and without tags, 400 responses with exact body `{"error":"invalid tag"}` for too-long and whitespace tags, GET returns tags.
- Unit (web, jsdom): tags rendered after the title as `news, tech`; nothing rendered for `[]`; existing Remove wiring still works.
- Regression: existing tests in all three packages keep passing.
- No manual, live-app, or end-to-end checks are planned; jsdom rendering tests cover AC 4.
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`; bundle size via `pnpm build` and `pnpm measure`.

## Operational Requirements

- The `test` status check (GitHub Actions, integration 15368) must pass before merge — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test`, plus `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected" (no classic protection); owner: repository admins (`panz3r`).
- One approving review is required before merge — where: same ruleset; evidence: as above; owner: repository admins (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`.
- The change adds, removes, or renames no CI check contexts.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-30 — Plan drafted from Jira FIJIH-66 (revision 2026-10-30T17:23:35.882+0100); issue assigned to Mattia Panzeri.
