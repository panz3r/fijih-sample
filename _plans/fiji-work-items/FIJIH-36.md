---
schema: fiji/work-item/v1
id: FIJIH-36
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-36
  revision: 2026-10-28T14:00:12.914+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-36-add-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-36: Add tags to bookmarks

## Story

As a user,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

Source: Jira FIJIH-36 (Story, Medium), revision `2026-10-28T14:00:12.914+0100`. No comments, attachments, links, or Figma URLs.

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

Open product questions (also under the Plan result's risks; none blocks drafting):

- Q1. The add form in `packages/web/index.html` has only Title and URL inputs. The issue says the page *shows* tags, not that a user can *enter* them. Is a tags input on the add form in scope? This plan assumes **no** (tags are set only through the API), so the page displays tags but cannot create them.
- Q2. Is a non-array `tags` value, or an array entry that is not a string, a 400 `{"error":"invalid tag"}`? This plan assumes **yes**.
- Q3. Is a tag that is empty after trimming (for example `"  "`) a 400 `{"error":"invalid tag"}`, or silently dropped? This plan assumes **400**.
- Q4. Is the 32-character limit checked after trimming? This plan assumes **yes** (validation runs on the trimmed value, so leading and trailing whitespace is trimmed, not rejected; only inner whitespace is rejected).

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, duplicates are removed keeping first-occurrence order, and the `201` response body carries the resulting `tags`. When `tags` is omitted the bookmark has `tags: []`.
2. `POST /bookmarks` with a tag that is longer than 32 characters (after trimming), contains whitespace (after trimming), is empty after trimming, is not a string, or with a `tags` value that is not an array answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, joined with `", "`; a bookmark with no tags shows no tag text and no tag element.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour of criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] T1. Shared tag model and normaliser (AC: 1, 2, 5)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` (or `readonly string[]`) to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure `normalizeTags(value: unknown): string[]` that returns `[]` for `undefined`, trims, lower-cases, and deduplicates (first occurrence wins), and throws (or signals) invalid for a non-array, a non-string entry, an empty trimmed tag, a trimmed tag over 32 characters, or a trimmed tag containing whitespace. Export `MAX_TAG_LENGTH = 32`.
  - [x] Tests in `packages/shared/src/index.test.ts`: default `[]`, trim + lower-case + dedupe, exactly 32 characters accepted, 33 rejected, inner space and tab rejected, empty-after-trim rejected, non-array and non-string rejected.
- [ ] T2. API accepts, stores, and returns tags (AC: 1, 2, 3, 5)
  - [ ] `packages/api/src/store.ts`: `add` normalises tags via `normalizeTags`, maps invalid input to `ValidationError("invalid tag")`, and stores `tags` on the bookmark; validation happens before insertion so a rejected request stores nothing.
  - [ ] `packages/api/src/app.ts`: pass `body.tags` through to `store.add`.
  - [ ] Tests in `packages/api/src/app.test.ts`: POST with mixed-case, padded, duplicate tags returns normalised tags; POST without tags returns `tags: []`; each invalid case answers `400 {"error":"invalid tag"}` and the list is unchanged; GET returns tags per bookmark.
- [ ] T3. Web page shows tags after the title (AC: 4, 5)
  - [ ] `packages/web/src/render.ts`: after the link, when `bookmark.tags.length > 0`, append an element (for example `<span class="tags">`) whose text is `bookmark.tags.join(", ")`; append nothing otherwise. Use `textContent`, never HTML.
  - [ ] Tests in `packages/web/src/render.test.ts`: tags render after the title comma separated; no tag element when `tags` is `[]`; update existing fixtures to include `tags`.
- [ ] T4. Bundle size baseline (AC: 5)
  - [ ] Run `pnpm build` then `pnpm measure`; if `web_bundle_gzip_delta` is non-zero, update `measure/baseline.json` `web_bundle_gzip_bytes` to the new value in this change (AGENTS.md).
- [ ] T5. Change intent (AC: 5)
  - [ ] Add a changeset in `.changeset/` whose summary is `Add tags to bookmarks`, bumping `@sample/shared`, `@sample/api`, and `@sample/web` (patch/minor per team convention; minor for a new feature).
- [ ] T6. Full checks (AC: 5)
  - [ ] Run `pnpm test`, `pnpm lint`, `pnpm typecheck` from the repository root and record results.

## Engineering Context

- Workspace: `packages/shared` (types and pure functions) is imported from source by `packages/api` and `packages/web` (AGENTS.md).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, URL helpers. Tag normalisation belongs here as a pure function so API and tests share it.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 {"error": message}`. Reusing that path gives `{"error":"invalid tag"}` without new HTTP code.
  - `packages/api/src/app.ts` — POST handler currently builds `{ url, title }` from the body; it must forward `tags`.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with `<a>` (title) and a Remove `<button>`; tags go between them. `index.html` styles `li` as flex with `space-between`; a tags span between link and button stays readable but layout polish is not required by the issue.
  - `packages/web/src/main.ts` — submits only title and url; unchanged under the Q1 assumption.
- Validation order in `store.add`: keep existing title and url checks first, then tags, so existing error messages are unchanged for existing cases. A request with both a bad URL and a bad tag reports the URL error.
- Storage is in-memory (`Map`); there is no persisted data, so no migration is needed.
- `Bookmark.tags` becomes required; every fixture constructing a `Bookmark` (for example `render.test.ts`) must add `tags`.

## Testing Strategy

- Unit (`packages/shared`, Vitest): `normalizeTags` happy path, boundaries (32 vs 33 chars), whitespace rules, dedupe order, invalid types.
- Integration (`packages/api`, Vitest against a real `http` server on an ephemeral port, as the existing `app.test.ts` does): POST with and without tags, every invalid-tag variant returning `400 {"error":"invalid tag"}` without storing, GET round trip.
- Unit (`packages/web`, Vitest + jsdom): rendering with tags, without tags, and existing empty-state and Remove behaviour unchanged.
- Unhappy paths are covered in shared and api tests above. No migration, design (no Figma), or end-to-end checks apply; no manual live-app check is required by the issue.
- Release: changeset (T5) and bundle baseline (T4). No criterion is CI-only.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) must pass before merge — where: repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`, and `.github/workflows/ci.yml` defines job `test` on `pull_request`; owner: repository admin (`panz3r`).
- One approving review, squash merge only — where: same ruleset `main`; evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`; `gh api repos/panz3r/fijih-sample/collaborators/duckyduff369/permission` returned `write`.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected". This change adds, removes, or renames no CI check contexts. No environments, secrets, deploy configuration, or other repositories are involved.

## File List

- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`

## Implementation Record

- T1: Added tags to Bookmark/NewBookmark, MAX_TAG_LENGTH, InvalidTagError, and normalizeTags (signals invalid by throwing InvalidTagError). Shared test (9 tests), lint, typecheck passed.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Plan drafted from FIJIH-36 revision `2026-10-28T14:00:12.914+0100`; issue assigned to Mattia Panzeri.
- 2026-10-28: Approved: plan-approval — approve, assumptions are correct
- 2026-10-28: T1 implemented
