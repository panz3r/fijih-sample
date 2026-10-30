---
schema: fiji/work-item/v1
id: FIJIH-55
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-55
  revision: 2026-10-30T10:45:12.771+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-55-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-55: Add tags to bookmarks

## Story

As a user who saves many bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group related bookmarks and see those groups on the page.

## Product Context

Source: Jira Story FIJIH-55 "Add tags to bookmarks" (no comments, no attachments, no Figma link).

- Context (from the issue): "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision (from the issue): "Tags are not filterable yet."
- Out of scope (from the issue): "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- The issue's acceptance criteria are restated, made measurable, as Acceptance Criteria 1 to 5 below.

Product decisions (answered by the user at plan approval; no open product questions remain):

- Q1 (decided). The add form in `packages/web/index.html` / `packages/web/src/main.ts` gets **no** tags input; tags are set through the API only.
- Q2 (decided). A `tags` value that is not an array, or an array with a non-string element, answers `400 {"error":"invalid tag"}`; a tag that is empty after trimming is rejected with the same `400` (not dropped); the stored tags keep the first-occurrence order of the input.
- Q3 (decided). The 32-character limit and the whitespace check apply to the tag *after* trimming (so `"  news  "` is valid and becomes `"news"`, a 32-character tag is valid, a 33-character one is not, and `"breaking news"` is invalid).
- Q4 (decided). The change updates `measure/baseline.json` to the new gzipped web bundle size.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (compared after trimming and lower-casing) are removed, keeping the first occurrence so the resulting tags are in first-occurrence order of the input. The `201` response body includes the resulting `tags`. When `tags` is omitted, the bookmark's `tags` is `[]`.
2. `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing when `tags` is present but not an array, when any element is not a string, when any tag is empty after trimming, or when any tag, after trimming, is longer than 32 characters or contains whitespace. A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns a `tags` array on every bookmark (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`), and shows no tag text or tag element for a bookmark whose `tags` is empty.
5. Vitest tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root. After `pnpm build`, `measure/baseline.json` holds the gzipped web bundle size `pnpm measure` prints.

## Tasks and Subtasks

- [ ] T1. Shared tag model and normalisation in `packages/shared/src/index.ts` (AC: 1, 2, 5)
  - [ ] Add `tags: string[]` to `Bookmark`; let `NewBookmark` take an optional `tags`.
  - [ ] Add a pure, exported tag normaliser (for example `normalizeTags`) that trims, lower-cases, and deduplicates keeping first-occurrence order, and a validity check (for example `isValidTag`) for the non-empty, 32-character, and no-whitespace rules, all applied after trimming.
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case and surrounding spaces with first-occurrence order kept, 32 vs 33 characters, internal whitespace, empty-after-trim tag, empty input.
- [ ] T2. API store and route in `packages/api` (AC: 1, 2, 3, 5)
  - [ ] `BookmarkStore.add` validates tags through the shared helpers, throws `ValidationError("invalid tag")` before storing anything when `tags` is not an array, an element is not a string, or a tag is empty after trimming, too long, or contains whitespace, and stores the normalised tags (default `[]`).
  - [ ] `createApp` passes `body.tags` from the `POST /bookmarks` body to the store.
  - [ ] Tests in `packages/api/src/store.test.ts` and `packages/api/src/app.test.ts`: POST with tags returns normalised tags; POST without tags returns `[]`; 33-character tag, tag with internal whitespace, non-array `tags`, non-string element, and empty-after-trim tag each answer `400 {"error":"invalid tag"}` and the list is unchanged; tags come back in first-occurrence order; GET returns each bookmark's tags.
- [ ] T3. Web rendering in `packages/web/src/render.ts` (AC: 4, 5)
  - [ ] After the title link, render the tags joined by `", "` in their own element (text content only, no `innerHTML`); render nothing extra when `tags` is empty.
  - [ ] Tests in `packages/web/src/render.test.ts`: tags shown after the title as `news, tech`; no tag element or text when `tags` is `[]`; update the existing fixtures to the new `Bookmark` shape.
- [ ] T4. Repository checks and bundle size (AC: 5)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root.
  - [ ] Run `pnpm build` then `pnpm measure`, and update `measure/baseline.json` to the new `web_bundle_gzip_bytes` in this change (AGENTS.md; the user decided the baseline is updated).

## Engineering Context

- Layout (AGENTS.md): pnpm workspace; `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web`. Tag rules belong in `shared` so the API and any later client use one definition.
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` is optional on input but required on `Bookmark`.
  - `packages/api/src/store.ts`: in-memory `BookmarkStore` (`Map`); `add` validates and throws `ValidationError`, which `app.ts` maps to `400 { error: message }`. Validation must complete before `items.set`, matching the existing title and URL checks.
  - `packages/api/src/app.ts`: `POST /bookmarks` currently reads only `url` and `title` from the body.
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with an `<a>` title link and a Remove button; `index.html` styles `li` as `display: flex; justify-content: space-between`, so the tags element should sit inside the item next to the link (for example wrap link and tags, or place tags between link and button) without breaking the Remove button's position.
- Typing impact: adding the required `tags` field to `Bookmark` breaks the existing `render.test.ts` fixture and any other literal `Bookmark` value; T3 updates them.
- No persistence or migration: the store is in memory, so there are no existing records to backfill.
- Security: render tags with `textContent` only (user-supplied strings).
- Not changed (decided, Q1): the add form in `packages/web/index.html` and its submit handler in `packages/web/src/main.ts`.
- Delivery (owned by `fiji-deliver-change`, not an Implementation task): the pull request changes packages, so it needs a changeset in `.changeset/` whose summary is "Add tags to bookmarks"; label `enhancement` (Story); reviewers from TEAMS.md (QA Engineer `duckyduff369`).

### Defaults taken at plan approval

- `tags: null` in the request body — treated as a non-array and answered `400 {"error":"invalid tag"}`; only an omitted `tags` (or `undefined`) defaults to `[]`.
- An explicit empty array `tags: []` — valid, stored as `[]`.
- Order of checks — type and empty-after-trim checks run on every element before deduplication, so one invalid element rejects the whole request even if it would have been a duplicate.

## Testing Strategy

- Unit (shared): table-style cases for the normaliser and validity check, including boundaries (32/33 characters), case and whitespace deduplication, and the empty array.
- Unit (api store): `BookmarkStore.add` with and without tags, invalid-tag rejection leaving the store unchanged.
- Integration (api HTTP): `app.test.ts` exercises `POST /bookmarks` and `GET /bookmarks` over a real `node:http` server on an ephemeral port, as the existing tests do: happy path with tags, default `[]`, `400 {"error":"invalid tag"}` for each invalid kind.
- Unit (web, jsdom): `renderList` output with tags and without tags.
- Unhappy paths beyond the issue (non-array `tags`, non-string element, empty-after-trim tag) are tested in shared, store, and HTTP, per Q2.
- No manual, live-app, or end-to-end check is required by the issue; none is planned.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`; `pnpm build` + `pnpm measure` for the bundle baseline.

## Operational Requirements

- Required status check `test` (the `test` job of `.github/workflows/ci.yml`) must pass before merge — where: GitHub repository ruleset `main` (id 26033321, enforcement active) on `panz3r/fijih-sample`; evidence: `gh api --method GET repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test` (integration_id 15368), and `gh api --method GET repos/panz3r/fijih-sample/rulesets` listed ruleset `main` as active; owner: repository admin (`panz3r`).
- One approving review and squash-only merge into `main` — where: the same ruleset `main` (id 26033321); evidence: the same `rules/branches/main` read returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`).
- No classic branch protection on `main` — where: GitHub branch protection; evidence: `gh api --method GET repos/panz3r/fijih-sample/branches/main/protection` answered `404 Branch not protected`; owner: repository admin (`panz3r`).
- This change adds, removes, or renames no CI check context, needs no secrets, environments, deploy configuration, or other repositories.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-30: Drafted from Jira FIJIH-55 (revision 2026-10-30T10:45:12.771+0100); issue assigned to the current user.
- 2026-10-30: Plan approval requested changes (conditional approval): "Approve the plan. 1: no tags input on the form. 2: a non-array tags or a non-string element answers 400 {"error":"invalid tag"}; a tag empty after trimming is rejected with that 400; tags keep first-occurrence order. 3: yes, length and whitespace rules apply after trimming, as the plan reads it. 4: fine, update the baseline." Applied: Q1 to Q4 recorded as decided; AC 1, 2, 5 and tasks T1, T2, T4 updated; three defaults recorded in Engineering Context.
