---
schema: fiji/work-item/v1
id: FIJIH-48
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-48
  revision: "2026-10-29T16:12:10.397+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-48-add-tags-to-bookmarks
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-48: Add tags to bookmarks

## Story

As a user who keeps many bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group related bookmarks.

## Product Context

Source: Jira FIJIH-48 (Story, Medium, label `scenario-S18`), revision `2026-10-29T16:12:10.397+0100`, no comments, no attachments, no Figma reference.

Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."

Issue acceptance criteria, quoted:

- POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
- GET /bookmarks returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.

Decisions (from the issue):

- Tags are not filterable yet.

Out of scope (from the issue):

- Filtering or searching by tag.
- Editing tags of an existing bookmark.

Open product questions (asked at `plan-approval`; the proposed answer is what the plan assumes until the user decides):

1. Blank tags: a tag that is empty after trimming (`""`, `"   "`). Proposed: reject with 400 `{"error":"invalid tag"}`, because a blank tag cannot group anything. Alternative: drop it silently.
2. Malformed `tags`: a `tags` value that is not an array, or an array element that is not a string. Proposed: 400 `{"error":"invalid tag"}`.
3. Length and whitespace rules apply to the trimmed tag (so `"  news  "` is valid and stored as `"news"`, while `"two words"` is rejected), and length counts JavaScript string length. Proposed: yes.
4. Order of returned tags: first-occurrence order of the input after normalisation (`["B", "a", "b"]` becomes `["b", "a"]`). Proposed: yes; alternative: sorted alphabetically.
5. Web add form: the issue says the page *shows* tags but does not say whether the page's add form gets a tags input. Proposed: out of scope (tags are set through the API only); the user decides.
6. `README.md` describes `packages/shared` as "URL validation and normalisation, sorting" and the API endpoints without payloads. Proposed: leave it unchanged; the user decides whether to mention tags there.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed, lower-cased, and deduplicated after normalisation, in first-occurrence order (open question 4). When `tags` is omitted, the bookmark is stored with `tags: []`. The 201 response body contains the normalised `tags`.
2. A tag that, after trimming (open question 3), is longer than 32 characters or contains whitespace makes `POST /bookmarks` answer 400 with exactly `{"error":"invalid tag"}`, and no bookmark is stored. A tag of exactly 32 characters is accepted. (Blank and malformed tags follow open questions 1 and 2.)
3. `GET /bookmarks` returns a `tags` array on every bookmark: the normalised tags, or `[]` when it has none.
4. The web page shows each bookmark's tags after its title as one text joined by `", "` (for example `news, tech`), and adds no tag element or text for a bookmark with no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 4, including the 32/33-character boundary, inner whitespace, case and duplicate folding, the omitted-`tags` default, and the no-tags rendering.
6. Project conventions from `AGENTS.md` hold: `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root; the change adds a changeset in `.changeset/` whose summary is `Add tags to bookmarks`; and `measure/baseline.json` holds the gzipped web bundle size that `pnpm build` then `pnpm measure` prints on this branch.

## Tasks and Subtasks

- [x] Shared types and pure functions in `packages/shared/src/index.ts` (AC: 1, 2, 3)
  - [x] Add `tags: string[]` to `Bookmark`; widen `NewBookmark` to `Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] }`.
  - [x] Add `isValidTag(tag: string): boolean`: true when the trimmed tag is at most 32 characters and has no whitespace (`/\s/`), plus the blank-tag rule from open question 1.
  - [x] Add `normalizeTags(tags: readonly string[]): string[]`: trim, lower-case, deduplicate in first-occurrence order.
- [x] Shared unit tests in `packages/shared/src/index.test.ts` (AC: 5)
  - [x] `isValidTag`: 32 characters accepted, 33 rejected, inner space and tab rejected, surrounding whitespace accepted, blank per open question 1.
  - [x] `normalizeTags`: trimming, lower-casing, duplicate folding across case and whitespace, order kept, input not mutated, `[]` in gives `[]` out.
- [ ] API store and route (AC: 1, 2, 3)
  - [ ] `packages/api/src/store.ts` `add()`: when `input.tags` is given, throw `ValidationError("invalid tag")` if any tag fails `isValidTag` (and for malformed input per open question 2), else store `normalizeTags(input.tags)`; default `[]`. Validate before inserting, so a rejected request stores nothing.
  - [ ] `packages/api/src/app.ts` POST handler: read `tags` from the body and pass it to `store.add` without coercing it, so the store can reject malformed values.
- [ ] API tests in `packages/api/src/app.test.ts` (AC: 5)
  - [ ] POST with `tags: [" News ", "news", "TECH"]` answers 201 with `tags: ["news", "tech"]`, and GET returns the same tags on that bookmark.
  - [ ] POST without `tags` answers 201 with `tags: []`.
  - [ ] POST with a 33-character tag and with `"two words"` each answer 400 `{"error":"invalid tag"}`, and GET shows no new bookmark.
  - [ ] Malformed and blank tags per open questions 1 and 2.
- [ ] Web rendering in `packages/web/src/render.ts` (AC: 4)
  - [ ] After the title link, append an element (for example `<span class="tags">`) whose text is `bookmark.tags.join(", ")`, only when `bookmark.tags.length > 0`.
- [ ] Web tests in `packages/web/src/render.test.ts` (AC: 5)
  - [ ] Add `tags` to the existing fixtures so they type-check.
  - [ ] A bookmark with `["news", "tech"]` shows `news, tech` after its title; a bookmark with `[]` renders no tags element and its item text is only the title and `Remove`.
- [ ] Delivery conventions (AC: 6)
  - [ ] Add a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with summary `Add tags to bookmarks`.
  - [ ] Run `pnpm build` then `pnpm measure`, and update `web_bundle_gzip_bytes` in `measure/baseline.json` to the printed value when it differs from 835.
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.

## Engineering Context

- Workspace: pnpm, ESM, TypeScript; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `api` and `web`. Relative imports use the `.js` suffix.
- `packages/shared/src/index.ts` holds `Bookmark`, `NewBookmark`, and the pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag helpers belong here, per `AGENTS.md` ("types and pure functions").
- `packages/api/src/store.ts` `BookmarkStore.add()` validates title, then URL, then URL uniqueness, and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }` and a JSON `SyntaxError` to 400 `{"error":"invalid json"}`. Throwing `ValidationError("invalid tag")` gives the exact body AC 2 requires with no route change beyond passing `tags` through.
- The store is in memory (`Map`), so there is no persisted data and no migration: every bookmark is created with `tags`.
- `packages/web/src/render.ts` `renderList()` builds `<li><a>title</a><button>Remove</button></li>`; `index.html` styles `li` as flex with `space-between`, so the tags element sits between the title and the button. Use `textContent`, not HTML, for the tag text.
- `packages/web/src/main.ts` passes `GET /bookmarks` results straight to `renderList`; it needs no change unless open question 5 brings a tags input into scope (then `index.html` form and `main.ts` submit handler change too).
- Web tests run in jsdom (`packages/web/vite.config.ts`).
- Engineering choice: validate tags after the URL checks and before inserting, so a request with both a bad URL and a bad tag reports the URL error, as today.

## Testing Strategy

- Unit (shared): `isValidTag` and `normalizeTags` happy, boundary (32 vs 33), whitespace, case, duplicate, blank, and immutability cases. Run `pnpm --filter @sample/shared test`.
- Integration (api): `app.test.ts` drives the real `http` server with `fetch`: tags round-trip through POST and GET, default `[]`, each 400 case with the exact body, and no bookmark stored on rejection. Run `pnpm --filter @sample/api test`.
- Unit (web, jsdom): rendering with tags, without tags, and the existing Remove wiring. Run `pnpm --filter @sample/web test`.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; CI's `test`, `lint`, and `typecheck` jobs run the same on the pull request.
- Bundle size: `pnpm build` then `pnpm measure`; CI's `measure` job reports the delta against `measure/baseline.json`.
- No manual or live-app check: the issue asks for unit tests only.

## Operational Requirements

- Merging into `main` needs the required status check `test` to pass — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test` (integration 15368); owner: repository admin (`panz3r`).
- Merging into `main` needs one approving review and a squash merge — where: repository ruleset `main` (id 26033321); evidence: the same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). `TEAMS.md` names `duckyduff369` (QA Engineer) as the approver.
- This change adds, removes, and renames no CI check contexts; the `test` job in `.github/workflows/ci.yml` runs on `pull_request`.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts

## Implementation Record

Task 1 and 2 — shared tag types, `isValidTag` (trimmed, non-blank, <= 32 chars, no whitespace) and `normalizeTags` (trim, lower-case, de-duplicate in first-occurrence order), with unit tests for 32/33 boundary, inner space/tab, trimming, blank, case and duplicate folding, order, immutability, and `[]`.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-29: Drafted from Jira FIJIH-48 revision `2026-10-29T16:12:10.397+0100` (issue assigned to the current user before reading the revision). Six open product questions recorded in Product Context for `plan-approval`.
- 2026-10-29: Approved: plan-approval — Approve. Answers: 1 yes, a blank tag after trimming answers 400 invalid tag; 2 yes, a non-array or non-string tags value answers 400; 3 yes, the rules apply to the trimmed tag; 4 yes, keep first-occurrence order; 5 no tags input on the add form; 6 leave README.md unchanged.
- 2026-10-29: Implemented shared tag helpers and tests (tasks 1-2).
