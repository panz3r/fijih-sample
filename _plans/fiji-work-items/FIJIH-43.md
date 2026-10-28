---
schema: fiji/work-item/v1
id: FIJIH-43
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-43
  revision: "2026-10-28T21:48:02.496+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-43-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-43: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks and see each one's group next to its title.

## Product Context

Source: Jira story FIJIH-43 "Add tags to bookmarks" (type Story, priority Medium, label `scenario-S17`), revision `2026-10-28T21:48:02.496+0100`. The issue has no comments, attachments, links, or Figma URLs.

Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."

Issue acceptance criteria, quoted:

- POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
- GET /bookmarks returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.

Decisions in the issue: tags are not filterable yet.

Out of scope in the issue: filtering or searching by tag; editing tags of an existing bookmark.

Open product questions (also under the Plan result's `risks`; answer at `plan-approval`):

1. Web add form: the issue says the page *shows* tags but not whether the add form lets a user *enter* them. Is a tags input on the add form in scope? This plan assumes **no** (tags are set through the API only) until answered.
2. Malformed `tags`: what does POST answer when `tags` is present but not an array, or holds a non-string element? This plan proposes 400 `{"error":"invalid tag"}`.
3. Empty tags: is a tag that is empty after trimming (`""`, `"   "`) rejected with 400 `{"error":"invalid tag"}`, or silently dropped? This plan proposes rejecting it.
4. Validation order: this plan reads the issue as validating each tag *after* trimming, so `"  news  "` is accepted as `news` and only inner whitespace (`"my tag"`) is rejected; the 32-character limit counts the trimmed tag's characters (`string.length`). Confirm.
5. Separator: "comma separated" is rendered as `, ` (comma and space), e.g. `news, tech`. Confirm.
6. README: `README.md` describes `packages/shared` as "URL validation and normalisation, sorting". Adding tag normalisation there leaves that row incomplete. Is updating that README row in scope?

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings; each tag is trimmed and lower-cased, duplicates (after trimming and lower-casing) are removed keeping the first occurrence's position, and the created bookmark in the 201 response carries the resulting `tags` array. A request without `tags` creates a bookmark with `tags: []`.
2. `POST /bookmarks` answers 400 with body exactly `{"error":"invalid tag"}`, and stores nothing, when any tag (after trimming) is longer than 32 characters or contains whitespace; a tag of exactly 32 characters is accepted. (Product questions 2 to 4 may extend this criterion.)
3. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags the bookmark was created with after normalisation (`[]` when it has none).
4. The web page shows each bookmark's tags after its title, joined by `, ` (product question 5), and renders no tag text and no tag element for a bookmark with no tags; the link and Remove button keep working as before.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in criteria 1 to 4, including the 32/33-character boundary, inner whitespace, case and whitespace deduplication, the default empty array, and the no-tags rendering.
6. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build && pnpm measure` prints on this branch (delta 0), per `AGENTS.md`.
7. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] Shared tag model and normalisation in `packages/shared/src/index.ts` (AC: 1, 2, 3)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a `MAX_TAG_LENGTH = 32` constant, a pure `isValidTag(tag: string): boolean` (non-empty per question 3, at most 32 characters, no whitespace `/\s/`, checked on the trimmed value), and a pure `normalizeTags(tags: readonly string[]): string[]` (trim, lower-case, deduplicate keeping first occurrence).
- [x] Shared unit tests in `packages/shared/src/index.test.ts` (AC: 5)
  - [x] `normalizeTags`: trims, lower-cases, deduplicates `["News", " news ", "NEWS"]` to `["news"]`, keeps first-occurrence order, returns `[]` for `[]`, and does not mutate its input.
  - [x] `isValidTag`: accepts a 32-character tag and a tag with surrounding whitespace; rejects a 33-character tag, `"my tag"`, a tab or newline inside, and (per question 3) an empty or blank tag.
- [x] API store and route in `packages/api/src/store.ts` and `packages/api/src/app.ts` (AC: 1, 2, 3)
  - [x] In `BookmarkStore.add`, validate `input.tags ?? []` (array of strings, per question 2), throw `ValidationError("invalid tag")` on the first invalid tag before storing, and store `normalizeTags(...)` on the bookmark.
  - [x] In `createApp`, pass `body.tags` through from the POST body to `store.add` without changing the existing `url`/`title` handling.
- [x] API tests in `packages/api/src/app.test.ts` (AC: 5)
  - [x] POST with `tags: [" News ", "news", "Tech"]` answers 201 with `tags: ["news", "tech"]`; POST without `tags` answers 201 with `tags: []`.
  - [x] POST with a 33-character tag and with `"my tag"` each answers 400 `{"error":"invalid tag"}`, and the following GET does not contain those bookmarks; a 32-character tag is accepted.
  - [x] (per question 2) POST with `tags: "news"` and with `tags: [1]` answers 400 `{"error":"invalid tag"}`.
  - [x] GET `/bookmarks` returns each bookmark's normalised `tags`.
- [ ] Web rendering in `packages/web/src/render.ts` (AC: 4)
  - [ ] After the title link, append a `<span class="tags">` whose text is `bookmark.tags.join(", ")` only when `bookmark.tags.length > 0`; append nothing otherwise. Keep the Remove button last.
  - [ ] Adjust `packages/web/index.html` styles only as needed so the tags sit next to the title and the Remove button stays at the end of the row (the `li` is `display: flex; justify-content: space-between`).
- [ ] Web tests in `packages/web/src/render.test.ts` (AC: 5)
  - [ ] Update existing fixtures to include `tags: []`.
  - [ ] A bookmark with `tags: ["news", "tech"]` renders `news, tech` after the link and before the Remove button; a bookmark with `tags: []` renders no `.tags` element and the item's text is only the title and `Remove`.
- [ ] Bundle baseline (AC: 6)
  - [ ] Run `pnpm build` then `pnpm measure`; set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value (current baseline 835) and re-run `pnpm measure` to confirm delta 0.
- [ ] Repository checks (AC: 7)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results in Validation Evidence.

## Engineering Context

- Workspace (from `AGENTS.md`): `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web`. Tag normalisation and validation therefore live in `shared` as pure functions; the API store owns the 400 decision through its existing `ValidationError`, which `createApp` already maps to `400 {"error": <message>}`.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">` (becomes `Pick<...> & { tags?: readonly string[] }` or equivalent so `tags` stays optional on input while `Bookmark.tags` is required on output), `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates title then URL then duplicate URL; tag validation slots in after those checks so existing error precedence is unchanged.
  - `packages/api/src/app.ts`: the POST handler casts the body to `{ url?: string; title?: string }`; widen it to include `tags?: unknown` and let the store validate the shape.
  - `packages/web/src/render.ts`: `renderList` builds `li > a + button`; `packages/web/src/main.ts` needs no change unless product question 1 brings a tags input into scope.
- Implementation choices within the criteria: lower-casing uses `String.prototype.toLowerCase()` (locale-independent); deduplication keeps the first occurrence's position; tag length counts UTF-16 code units (`string.length`); tags are rendered with `textContent`, never `innerHTML`.
- Adjacent items:
  - Filtering or searching by tag, and editing tags of an existing bookmark: out of scope (Jira FIJIH-43, "Out of scope" and "Decisions").
  - `DELETE /bookmarks/:id` and `GET /health`: unaffected.
  - Web add form tags input (product question 1) and the README `packages/shared` row (product question 6): asked under `risks`; not planned until answered.
- Bundle: adding a tags element to `render.ts` grows the gzipped web bundle; `AGENTS.md` requires `measure/baseline.json` to move in the same pull request (AC 6).
- Change intent: `AGENTS.md` requires a changeset in `.changeset/` whose summary is the pull request title without the Jira key ("Add tags to bookmarks"); Delivery (`fiji-deliver-change`) adds it, so it is not an Implementation task here.

## Testing Strategy

- Unit (Vitest, per package, as `AGENTS.md` requires for every behaviour change):
  - `packages/shared`: happy (normalisation, defaults) and unhappy (length, whitespace, blank) cases for `normalizeTags` and `isValidTag`, plus the 32/33 boundary.
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port, as the existing suite does: create with and without tags, invalid tag 400 with nothing stored, malformed `tags` 400 (per question 2), GET returns tags.
  - `packages/web`: jsdom `renderList` tests for tags shown after the title and for no tag output when empty; existing empty-state and Remove tests keep passing.
- Integration: the API tests exercise route, store, and shared functions together; no separate integration suite exists.
- Migration: none; the store is in-memory, so no persisted bookmarks lack `tags`.
- Design: no Figma reference; layout limited to keeping tags next to the title and Remove at the end of the row.
- Release: bundle baseline update (AC 6) and the root `pnpm test`, `pnpm lint`, `pnpm typecheck` run (AC 7). No manual, live-app, or end-to-end check is planned; no criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) must pass before merge to `main` — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`, and `.github/workflows/ci.yml` job `test` runs on `pull_request`; owner: repository admin (`panz3r`).
- One approving review and squash-only merge to `main` — where: same ruleset 26033321, `pull_request` rule; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). `TEAMS.md` names `duckyduff369` (QA Engineer) as the required approver.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected".
- This change adds, removes, or renames no CI check contexts, and needs no environments, secrets, deploy configuration, or other repositories.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts

## Implementation Record

- Shared tag model/tests: added `tags` to `Bookmark`, optional `tags` on `NewBookmark`, `MAX_TAG_LENGTH`, `isValidTag` (trimmed, non-empty, <=32, no whitespace), `normalizeTags` (Set keeps first-occurrence order). Focused: `pnpm --filter @sample/shared test` 8 passed.
- API store/route: `BookmarkStore.add` validates `input.tags ?? []` after title/url/duplicate checks (non-array, non-string, blank, >32, inner whitespace all throw `ValidationError("invalid tag")`), stores normalised tags; POST passes `body.tags` through. Focused: `pnpm --filter @sample/api test` 11 passed.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Drafted from Jira FIJIH-43 revision `2026-10-28T21:48:02.496+0100` (issue assigned to Mattia Panzeri during Plan).
- 2026-10-28: Approved: plan-approval — Approve, with the defaults for all six questions.
- 2026-10-28: Implemented shared tag model and tests.
- 2026-10-28: Implemented API tags handling and tests.

