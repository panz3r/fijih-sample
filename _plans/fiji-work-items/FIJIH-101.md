---
schema: fiji/work-item/v1
id: FIJIH-101
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-101
  revision: 2026-11-05T13:19:02.567+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
routing:
  class: standard
  source: rubric
  implementation_tier: standard
quality:
  gate: pending
artifacts:
  branch: FIJIH-101-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-101: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give a bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira story FIJIH-101 "Add tags to bookmarks" (Story, priority Medium, label `scenario-S7`, no comments, no attachments, no Figma link).
- Context from the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decisions in the issue: tags are not filterable yet.
- Out of scope in the issue: filtering or searching by tag; editing tags of an existing bookmark.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed, lower-cased, and deduplicated, and the `201` response body holds the normalized `tags`. When `tags` is omitted, the bookmark is stored with `tags: []`.
2. When a tag is longer than 32 characters or contains whitespace (checked after trimming), `POST /bookmarks` answers `400` with `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark without tags).
4. The web page shows each bookmark's tags after its title, comma separated (for example `news, tech`), and shows nothing for a bookmark without tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Shared tag model and normalization in `packages/shared/src/index.ts` (AC: 1, 2, 5)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add `MAX_TAG_LENGTH = 32` and a pure `normalizeTags(value: unknown): string[] | null` that returns `[]` for `undefined`, the trimmed, lower-cased, deduplicated tags in first-occurrence order for a valid array, and `null` when any entry is invalid (Open questions 1, 2, 5).
  - [x] Cover it in `packages/shared/src/index.test.ts`: default `[]`, trim, lower-case, dedup after normalization (`" News"` and `"news"` collapse), order, 32 characters accepted, 33 rejected, inner whitespace rejected, and the invalid shapes from Open question 1.
- [x] Store tags in `packages/api/src/store.ts` (AC: 1, 2, 3, 5)
  - [x] In `BookmarkStore.add`, after the existing title and URL checks and before the duplicate-URL check, normalize `input.tags` with `normalizeTags`; throw `ValidationError("invalid tag")` on `null`; store the normalized tags on the bookmark.
  - [x] Cover it in `packages/api/src/store.test.ts`: stored tags are normalized, default `[]`, an invalid tag throws and leaves `list()` unchanged.
- [x] Accept and return tags over HTTP in `packages/api/src/app.ts` (AC: 1, 2, 3, 5)
  - [x] Pass the request body's `tags` through to `store.add` unchanged (validation lives in the store and shared).
  - [x] Cover it in `packages/api/src/app.test.ts`: `POST` with tags returns `201` and normalized tags; `POST` without tags returns `tags: []`; a 33-character tag and a tag with inner whitespace each answer `400` `{"error":"invalid tag"}`; `GET /bookmarks` returns each bookmark's tags.
- [x] Show tags on the page in `packages/web/src/render.ts` (AC: 4, 5)
  - [x] After the title link, append an element (for example `<span class="tags">`) holding the tags joined by `", "` only when the bookmark has at least one tag (Open question 3).
  - [x] Update the fixture in `packages/web/src/render.test.ts` for the new required `tags` field and add tests: tags shown after the title, comma separated; no tags element and no extra text when `tags` is `[]`.
- [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results (AC: 5).
- [ ] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is not 0, update `measure/baseline.json` `web_bundle_gzip_bytes` to the printed `web_bundle_gzip_bytes` in this change, per `AGENTS.md` (AC: 4).

## Engineering Context

- Workspace: pnpm with `packages/shared` (types and pure functions, imported from source via `exports: ./src/index.ts`), `packages/api` (Node `http` service, in-memory `BookmarkStore`), and `packages/web` (Vite page, Vitest with `jsdom`).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark`, and the pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag normalization belongs here as a pure function, following the same pattern.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates input and throws `ValidationError`, which `packages/api/src/app.ts` maps to `400 {"error": <message>}`; so `ValidationError("invalid tag")` yields exactly `{"error":"invalid tag"}` without changes to the error mapping.
  - `packages/api/src/app.ts`: the `POST /bookmarks` handler builds `{ url, title }` from the JSON body; it gains `tags`. `GET /bookmarks` already returns `store.list()` as-is, so stored tags appear without handler changes.
  - `packages/web/src/render.ts`: `renderList` builds one `<li>` per bookmark with a title link and a Remove button; the tags element goes between them. `index.html` styles `li` as a flex row with `space-between`; no CSS change is required.
- `Bookmark.tags` becomes a required field, so every `Bookmark` literal (including the `render.test.ts` fixture) needs `tags`; `pnpm typecheck` finds them.
- Validation order: the existing title and URL checks run first, then tags, then the duplicate-URL check, so existing error responses stay as they are.
- The store is in memory, so no stored data needs migrating.
- The page's add form (`packages/web/src/main.ts`, `packages/web/index.html`) is not changed by this plan; see Open question 4.
- Change intent (the `.changeset/` entry required by `AGENTS.md` for a pull request that changes a package) is written at Delivery.

### Open questions

1. Should an empty tag (blank after trimming), a non-string entry in `tags`, or a `tags` value that is not an array also answer `400` with `{"error":"invalid tag"}`? Default: yes, all three are rejected as `invalid tag`.
2. In what order are a bookmark's tags returned and shown? Default: the order of first occurrence in the request after normalization, with no sorting.
3. What separates tags on the page? Default: a comma and a space (`news, tech`).
4. Should the page's add form gain a tags input in this item? The issue asks only that the page show tags, so without an input, tags can be set only through the API. Default: no; the form stays as it is.
5. Are the 32-character limit and the whitespace check applied after trimming and lower-casing, counting Unicode code points and treating any character matched by `\s` as whitespace? Default: yes.

## Testing Strategy

- Happy path (unit, Vitest):
  - `packages/shared`: `normalizeTags` trims, lower-cases, and deduplicates; returns `[]` for an omitted value; accepts a 32-character tag.
  - `packages/api`: `store.test.ts` stores normalized tags and defaults to `[]`; `app.test.ts` checks the `201` body and the `GET /bookmarks` list over real HTTP against `createApp()` on an ephemeral port (as the existing tests do).
  - `packages/web`: `render.test.ts` (jsdom) checks tags rendered after the title link, joined by `", "`.
- Unhappy path (unit, Vitest):
  - `packages/shared`: a 33-character tag, a tag with inner whitespace, and the shapes from Open question 1 return `null`.
  - `packages/api`: the same inputs answer `400` `{"error":"invalid tag"}` and leave `GET /bookmarks` unchanged.
  - `packages/web`: a bookmark with `tags: []` renders no tags element and no extra text, and the existing empty-state and Remove tests still pass.
- Release: `pnpm build` then `pnpm measure` for the gzipped web bundle; update `measure/baseline.json` in the same change when it moves (task above). Delivery adds the changeset.
- Checks before every commit, from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (the same as CI's `test`, `lint`, and `typecheck` jobs).

## Operational Requirements

None — this change needs no configuration outside the repository added, changed, or newly relied on.
- Evidence: `.github/workflows/ci.yml` read on `main` (8d4f0ec): the `test`, `lint`, `typecheck`, and `measure` jobs already run on `pull_request`, and this change adds, removes, or renames no job or check context and needs no secret, environment, or variable.
- Evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned the active `main` ruleset with `required_status_checks: [{"context":"test"}]` and a `pull_request` rule (1 approval, squash only); this change leaves them as they are.

## File List

- packages/web/src/render.ts
- packages/web/src/render.test.ts

- packages/api/src/app.ts
- packages/api/src/app.test.ts

- packages/api/src/store.ts
- packages/api/src/store.test.ts

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts

## Implementation Record

Task 1 — shared tag model and `normalizeTags`
- Added `tags` to `Bookmark`, optional `tags` to `NewBookmark`, `MAX_TAG_LENGTH = 32`, and `normalizeTags` (defaults `[]`, trim, lower-case, dedup in first-occurrence order, `null` for non-array, non-string, blank, over 32 code points, or whitespace-containing entries).
- Focused: `pnpm --filter @sample/shared test` 8 passed; `pnpm lint packages/shared` clean; `pnpm --filter @sample/shared typecheck` clean. Root typecheck of the dependents is covered by tasks 2-4.

Task 2 — `BookmarkStore.add` normalizes and stores tags
- After the title and URL checks and before the duplicate-URL check, `normalizeTags(input.tags)`; `null` throws `ValidationError("invalid tag")`; normalized tags are stored on the bookmark.
- Focused: `pnpm --filter @sample/api test` 8 passed; `pnpm lint packages/api` and `pnpm --filter @sample/api typecheck` clean.

Task 3 — `POST /bookmarks` passes `tags` to the store
- The handler passes `body.tags` through unchanged; `GET /bookmarks` returns stored tags as before. Tests cover 201 with normalized tags, default `[]`, 400 `{"error":"invalid tag"}` for a 33-character tag and inner whitespace with the list unchanged, and the GET list.
- Focused: `pnpm --filter @sample/api test` 8 passed; `pnpm lint packages/api` and `pnpm --filter @sample/api typecheck` clean.

Task 4 — web page shows tags after the title
- `renderList` appends `<span class="tags">` with the tags joined by `", "` between the title link and Remove only when the bookmark has tags. Tests cover the shown tags after the title, no element for `tags: []`, and the updated fixture.
- Focused: `pnpm --filter @sample/web test` 4 passed; `pnpm lint packages/web` and `pnpm --filter @sample/web typecheck` clean.

Task 5 — root checks
(checked at 899d31a)
- `pnpm test`: shared 8, api 8, web 4 tests passed. `pnpm lint`: eslint clean. `pnpm typecheck`: shared, api, web tsc clean.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-05: Plan drafted from Jira FIJIH-101 at revision 2026-11-05T13:19:02.567+0100; issue assigned to Mattia Panzeri.
- 2026-11-05: Approved: plan-approval — Approve with the proposed defaults for all five questions. Nothing to defer or grant. Publish: when Local QA passes cleanly, push this branch to origin, create or update its draft pull request, and request Copilot review without stopping at local-qa-review. Notify: when Copilot's review needed no change and every required check passes, mark the pull request ready and request review from duckyduff369 without stopping at ready-for-review. (answering: planned-check question) (answering: outside-write question)
- 2026-11-05: Routed: implementation — standard (score 2; source rubric; binding inherit; signals tasks 6, criteria 5, ci_criteria 0, operational_requirements false, integration_or_migration_work false, figma false, open_risks 0, plan_estimate light, recorded_floor null)
- 2026-11-05: Task 1 done: shared `normalizeTags` and tag types.
- 2026-11-05: Task 2 done: store keeps normalized tags.
- 2026-11-05: Task 3 done: tags accepted and returned over HTTP.
- 2026-11-05: Task 4 done: page renders tags.
- 2026-11-05: Task 5 done: root test, lint, typecheck pass.
