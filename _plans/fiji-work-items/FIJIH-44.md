---
schema: fiji/work-item/v1
id: FIJIH-44
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-44
  revision: "2026-10-28T22:54:03.939+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-44-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-44: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give a bookmark an optional list of tags and see them next to its title,
so that I can group my bookmarks.

## Product Context

Source: Jira story [FIJIH-44](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-44) "Add tags to bookmarks" (Story, priority Medium, label `scenario-S1`, 0 comments, no attachments, no Figma link).

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions: Tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.

### Open product decisions

The issue does not settle these. The plan uses the proposed answer in brackets until the user confirms or changes it at plan approval (each is also listed under the Plan result's risks):

- D1. A `tags` value that is not an array, or an array element that is not a string. [Proposed: answer 400 `{"error":"invalid tag"}`.]
- D2. A tag that is empty after trimming (`""` or `"   "`). [Proposed: answer 400 `{"error":"invalid tag"}`.]
- D3. Whether the 32-character limit is measured before or after trimming. [Proposed: after trimming; exactly 32 characters is accepted, 33 is rejected.]
- D4. Order of tags after deduplication. [Proposed: keep the order of first occurrence.]
- D5. Display format on the page. [Proposed: tags joined with `", "` in their own element directly after the title link and before the Remove button; no element and no text at all when the list is empty.]
- D6. A maximum number of tags per bookmark. [Proposed: no limit.]
- D7. When `title` or `url` is also invalid, which error wins. [Proposed: keep the existing order (title, then url), then tags, then the duplicate-url check.]

### Adjacent items not named by the issue

- Tag input on the web add form (`packages/web/index.html`, `packages/web/src/main.ts`): the issue says the API accepts tags and the page *shows* them, but does not say the page lets a user *enter* tags. Is a tags input on the add form in scope? [Plan assumes no: display only.]
- `measure/baseline.json`: the page change moves the gzipped web bundle size; AGENTS.md requires a pull request that knowingly moves it to update the baseline in the same change. In scope (task 4).
- Changeset: AGENTS.md requires one for a pull request that changes a package; Delivery (`fiji-deliver-change`) adds it, summary "Add tags to bookmarks".
- `DELETE /bookmarks/:id` and `GET /health`: unaffected.

## Acceptance Criteria

1. `POST /bookmarks` without a `tags` field answers 201 with a bookmark whose `tags` is `[]`.
2. `POST /bookmarks` with `tags` answers 201 with each tag trimmed, lower-cased, and deduplicated after normalisation (for example `[" News", "news", "Tech "]` → `["news", "tech"]`), keeping the order of first occurrence (D4).
3. `POST /bookmarks` with a tag longer than 32 characters after trimming, or containing whitespace after trimming, answers 400 `{"error":"invalid tag"}` and stores nothing; a tag of exactly 32 characters is accepted (D3).
4. `POST /bookmarks` with a `tags` value that is not an array, an element that is not a string, or a tag that is empty after trimming answers 400 `{"error":"invalid tag"}` and stores nothing (D1, D2).
5. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the normalised tags it was created with.
6. The web page shows each bookmark's tags after its title, joined with `", "`, and renders no tags element and no extra text for a bookmark with no tags (D5).
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. `measure/baseline.json` `web_bundle_gzip_bytes` equals the value `pnpm build && pnpm measure` prints on this branch (delta 0).

## Tasks and Subtasks

- [ ] 1. Shared tag model and normalisation in `packages/shared` (AC: 2, 3, 4, 7)
  - [ ] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` input to `NewBookmark`.
  - [ ] Add a pure `normalizeTags(value: unknown)` that returns `[]` for `undefined`, the trimmed, lower-cased, first-occurrence-deduplicated list for a valid array, and signals invalid input (not an array, non-string element, empty after trim, whitespace inside, longer than 32) without throwing a transport error; export the 32 limit as a constant.
  - [ ] Vitest cases in `packages/shared/src/index.test.ts`: default, trim, lower-case, dedupe after normalisation, order kept, 32 accepted, 33 rejected, inner whitespace (space, tab) rejected, empty and whitespace-only rejected, non-array and non-string rejected.
- [ ] 2. Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 4, 5, 7)
  - [ ] `BookmarkStore.add` validates tags with `normalizeTags` after the title and url checks, throws `ValidationError("invalid tag")` when invalid, and stores the normalised list on the bookmark.
  - [ ] `app.ts` passes `body.tags` through to `store.add`.
  - [ ] Vitest cases in `packages/api/src/app.test.ts`: POST without tags → `tags: []`; POST with mixed-case, padded, duplicated tags → normalised; each invalid case → 400 `{"error":"invalid tag"}` and the list is unchanged; GET returns the tags of each bookmark.
- [ ] 3. Show tags on the page in `packages/web` (AC: 6, 7)
  - [ ] `renderList` appends an element holding `tags.join(", ")` after the title link when the bookmark has tags, and nothing when it has none.
  - [ ] Update existing `render.test.ts` fixtures for the new required `tags` field; add cases for tags shown after the title, comma separated, and for no tags element when empty.
- [ ] 4. Update the bundle-size baseline (AC: 8)
  - [ ] Run `pnpm build` then `pnpm measure`; write the printed `web_bundle_gzip_bytes` into `measure/baseline.json` in its own `chore:` commit, and re-run `pnpm measure` to confirm delta 0.
- [ ] 5. Live-app check (AC: 1, 2, 5, 6)
  - [ ] Start the API (`pnpm --filter @sample/api start`) and the web dev server (`pnpm --filter @sample/web dev`); create one bookmark with tags `[" News", "news", "Tech "]` and one without via `curl` against the API; confirm `GET /bookmarks` shows `["news","tech"]` and `[]`, and the page shows "news, tech" after the first title and nothing extra after the second. Record the commands and output in Validation Evidence.
- [ ] 6. Run the full checks from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 7)

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported from source (`exports: ./src/index.ts`) by `@sample/api` and `@sample/web`. ESM with `.js` suffixes in relative imports. Node ≥ 24, TypeScript 5.9, Vitest 3 (web tests run in `jsdom`, `packages/web/vite.config.ts`).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, and the pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`); tag normalisation belongs here as a pure function.
  - `packages/api/src/store.ts` — `BookmarkStore.add` does validation and throws `ValidationError(message)`; the in-memory `Map` needs no migration.
  - `packages/api/src/app.ts` — maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` yields the required body. `readJson` casts the body; `tags` must be read as `unknown`, not trusted as `string[]`.
  - `packages/web/src/render.ts` — `renderList` builds each `<li>` as title link + Remove button; `li` uses `display: flex; justify-content: space-between` (`packages/web/index.html`), so the tags element should sit with the link (for example wrapped with it) to stay next to the title rather than being pushed to the middle. Use `textContent`, never `innerHTML`, for tag text.
  - `packages/web/src/main.ts` — fetches `/bookmarks` and calls `renderList`; no change needed for display.
- Making `Bookmark.tags` required changes the shared type: every `Bookmark` literal (the web test fixture) must add `tags`.
- "Containing whitespace" is tested with `/\s/` on the trimmed tag; length is the trimmed string's `length`.
- Commits: Conventional Commits, one logical change per commit (for example `feat: normalise bookmark tags in shared`, `feat: accept and return bookmark tags in the api`, `feat: show bookmark tags on the page`, `chore: update the web bundle baseline`), each with its tests.
- Delivery: PR title `[FIJIH-44] Add tags to bookmarks`, label `enhancement` (Story), a changeset for `@sample/shared`, `@sample/api`, `@sample/web` with summary "Add tags to bookmarks", reviewer `duckyduff369` (QA Engineer, TEAMS.md).

## Testing Strategy

- Unit (shared): table of valid and invalid inputs to `normalizeTags`, covering happy path (default, trim, lower-case, dedupe, order) and unhappy paths (33 characters, inner whitespace, empty, whitespace-only, non-array, non-string). Boundary at 32/33 characters.
- Integration (api): HTTP tests through `createApp` on an ephemeral port, as in the existing `app.test.ts`: 201 with default and normalised tags, each 400 `{"error":"invalid tag"}` case leaves `GET /bookmarks` unchanged, and `GET` returns tags. Use URLs distinct from the existing tests since the server instance is shared within the file.
- Unit (web): `renderList` in jsdom — tags appear after the title joined with `", "`; no tags element or extra text when empty; the existing empty-state and Remove tests still pass.
- Live-app check: task 5.
- Bundle size: task 4 (local `pnpm build` + `pnpm measure`); the CI `measure` job reports the same number but no criterion depends on CI alone.
- No migration (in-memory store) and no design source (no Figma link).

## Operational Requirements

- The pull request must pass the required status check `test` (the `test` job of `.github/workflows/ci.yml`, which runs `pnpm test` on `pull_request`) — where: GitHub repository ruleset `main` (id 26033321, enforcement active, target `~DEFAULT_BRANCH`); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `required_status_checks: [{context: "test", integration_id: 15368}]`, and `gh api repos/panz3r/fijih-sample/rules/branches/main` returns the same rule; owner: repository administrators of `panz3r/fijih-sample` (`panz3r`).
- The pull request needs one approving review and merges by squash only — where: same ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `pull_request.required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: repository administrators (`panz3r`). Per TEAMS.md/AGENTS.md the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` → 404 "Branch not protected".
- This change adds, removes, or renames no CI check contexts; no secrets, environments, deploy configuration, or other repositories are involved.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Plan drafted from FIJIH-44 at revision 2026-10-28T22:54:03.939+0100; issue assigned to Mattia Panzeri.
- 2026-10-28: Approved: plan-approval — Approve, with the proposed answers.
