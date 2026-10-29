---
schema: fiji/work-item/v1
id: FIJIH-49
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-49
  revision: "2026-10-29T17:44:20.074+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-49-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-49: Add tags to bookmarks

## Story

As a bookmarks user,
I want each bookmark to carry an optional list of tags that the API accepts and returns and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

Source: Jira issue FIJIH-49 (Story, priority Medium, label `scenario-S18`), revision `2026-10-29T17:44:20.074+0100`. The issue has no comments, attachments, links, or Figma URL.

From the issue:

- A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- `POST /bookmarks` accepts an optional `"tags"` array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
- A tag longer than 32 characters or containing whitespace answers `400` with `{"error":"invalid tag"}`.
- `GET /bookmarks` returns the tags of each bookmark.
- The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
- Unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour.
- Decision: tags are not filterable yet.
- Out of scope: filtering or searching by tag; editing tags of an existing bookmark.

Reading of the issue (not a new decision): because each tag is trimmed, the whitespace and 32-character checks apply to the trimmed tag, so `" work "` is the valid tag `work` and `"two words"` is invalid. Checking before trimming would reject every padded tag and make the trimming rule meaningless.

### Open decisions (to answer at plan approval)

The issue does not settle these. The acceptance criteria below use the proposed answer, marked "proposed", until the user confirms or changes it.

- D1 — Tag input on the web page's add form. The issue says only that the page *shows* tags. Without an input, tags can be set only through the API. Proposed: out of scope (display only).
- D2 — A `tags` value that is not an array of strings (for example `"tags": "work"`, `"tags": [1]`, or `"tags": null`). Proposed: `400 {"error":"invalid tag"}`.
- D3 — A tag that is empty after trimming (`""` or `"   "`). Proposed: `400 {"error":"invalid tag"}` (not silently dropped).
- D4 — Order and length unit. Proposed: tags are returned in first-occurrence order after deduplication, and "longer than 32 characters" counts Unicode code points of the trimmed tag (so exactly 32 is valid).
- D5 — Page separator. Proposed: `", "` (comma and space), for example `work, read`.
- D6 — `README.md` describes `packages/shared` as "URL validation and normalisation, sorting". Proposed: leave `README.md` unchanged (the API endpoint list is unchanged).

## Acceptance Criteria

1. `POST /bookmarks` without a `tags` field answers `201` with a bookmark whose `tags` is `[]`.
2. `POST /bookmarks` with `"tags"` as an array of strings answers `201` with each tag trimmed, lower-cased, and deduplicated (proposed per D4: in first-occurrence order), for example `[" Work ", "work", "READ"]` gives `["work", "read"]`.
3. `POST /bookmarks` answers `400` with `{"error":"invalid tag"}`, and stores no bookmark, when any trimmed tag is longer than 32 characters or contains whitespace (a 32-character tag is accepted); proposed per D2 and D3, also when `tags` is not an array of strings or a tag is empty after trimming.
4. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags stored when it was created.
5. The web page shows each bookmark's tags after its title, joined with a comma (proposed per D5: `", "`), and renders no tag text or tag element for a bookmark with no tags.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1 to 5, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. The change carries a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` whose summary is `Add tags to bookmarks`, and `measure/baseline.json` holds the `web_bundle_gzip_bytes` that `pnpm build` then `pnpm measure` reports on the branch when that value differs from the current baseline (835).

## Tasks and Subtasks

- [x] Shared: tag model and normalisation (AC: 1, 2, 3, 4, 6)
  - [x] Add `tags: string[]` to `Bookmark` and an optional `tags?: unknown` (or `string[]`) input to `NewBookmark` in `packages/shared/src/index.ts`.
  - [x] Add a pure `normalizeTags(input)` that returns `[]` for `undefined`, trims, lower-cases, and deduplicates (first-occurrence order), and reports an invalid tag (length over 32 code points after trimming, internal whitespace, and per D2/D3 a non-string element, non-array value, or empty tag).
  - [x] Vitest cases in `packages/shared/src/index.test.ts`: default `[]`, trimming, lower-casing, deduplication and order, exactly 32 accepted, 33 rejected, internal whitespace rejected, and the D2/D3 cases.
- [ ] API: accept, validate, store, and return tags (AC: 1, 2, 3, 4, 6)
  - [ ] Pass `body.tags` from `POST /bookmarks` in `packages/api/src/app.ts` to `BookmarkStore.add`.
  - [ ] In `packages/api/src/store.ts`, normalise tags with `normalizeTags`, throw `ValidationError("invalid tag")` for an invalid tag before anything is stored, and store `tags` on the bookmark.
  - [ ] Vitest cases in `packages/api/src/app.test.ts`: `201` with `tags: []` when omitted, `201` with normalised tags, `400 {"error":"invalid tag"}` for a 33-character tag, a tag with internal whitespace, and the D2/D3 cases, with the list unchanged after each rejection, and `GET /bookmarks` returning each bookmark's `tags`.
- [ ] Web: show tags after the title (AC: 5, 6)
  - [ ] In `packages/web/src/render.ts`, append an element after the title link holding the tags joined with the D5 separator, only when the bookmark has tags.
  - [ ] Keep the tags visually next to the title in `packages/web/index.html` (the `li` is `display: flex; justify-content: space-between`, which would otherwise centre the tags between the title and the Remove button).
  - [ ] Update the existing fixtures in `packages/web/src/render.test.ts` with `tags`, and add cases: tags shown after the title and comma separated, and no tag text or element when `tags` is `[]`.
- [ ] Run the root checks `pnpm test`, `pnpm lint`, and `pnpm typecheck` and record their results in Validation Evidence (AC: 6)
- [ ] Delivery conventions (AC: 7)
  - [ ] Add a changeset in `.changeset/` (`pnpm changeset` or by hand) for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary `Add tags to bookmarks`.
  - [ ] Run `pnpm build` then `pnpm measure`, record the output in Validation Evidence, and when `web_bundle_gzip_bytes` differs from 835 update `measure/baseline.json` to the new value in the same change.

## Engineering Context

- Workspace: pnpm; `packages/shared` is imported from source (`exports: ./src/index.ts`) by `packages/api` and `packages/web`. All three packages are `private: true`.
- `packages/shared/src/index.ts` holds the `Bookmark` interface, `NewBookmark = Pick<Bookmark, "url" | "title">`, and pure functions (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag normalisation belongs here as a pure function so `shared` can unit-test it and `api` can use it. `NewBookmark` must stop being a plain `Pick` (or extend it) so `tags` stays optional on input while `Bookmark.tags` is required.
- `packages/api/src/store.ts` `BookmarkStore.add` validates title, then URL, then duplicate URL, and throws `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 {"error": message}`. Throwing `new ValidationError("invalid tag")` produces exactly the required body. Validate tags after the existing checks and before `this.items.set`, so a rejected request stores nothing.
- `POST /bookmarks` currently casts the body to `{ url?: string; title?: string }` and passes only those; it must pass `tags` through untyped (`unknown`) so the D2 checks see the raw value.
- The store is in memory with no persistence, so there is no data migration; every bookmark created after the change has `tags`.
- `packages/web/src/render.ts` `renderList` builds `li > a + button`; tests run in jsdom (`packages/web/vite.config.ts`). Use `textContent`, not `innerHTML`, for tag text (tags are user input).
- `packages/web/src/main.ts` posts only `title` and `url`; it changes only if D1 brings a tag input into scope.
- Lower-casing uses `String.prototype.toLowerCase()` (locale-independent). Whitespace detection uses `/\s/` on the trimmed tag.
- No new dependencies. No CI, ruleset, or check-context changes.

## Testing Strategy

- Unit (Vitest), per AGENTS.md "every behaviour change comes with a Vitest test in the package it changes":
  - `packages/shared`: `normalizeTags` happy paths (default, trim, lower-case, dedupe, order, 32-character boundary) and unhappy paths (33 characters, internal whitespace, D2/D3 cases).
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port, as the existing `app.test.ts` does: create with and without tags, each rejection answering `400 {"error":"invalid tag"}` with nothing stored, and `GET /bookmarks` returning tags. This is the integration check between `shared` and `api`.
  - `packages/web`: `renderList` in jsdom with and without tags.
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` before every commit; CI runs the same jobs on the pull request.
- Bundle size: `pnpm build` then `pnpm measure` locally; update `measure/baseline.json` when the value moves (AC 7).
- No manual, live-app, or end-to-end check is planned: the page change is a pure render function covered in jsdom, and the API is tested over HTTP.

## Operational Requirements

- Merging into `main` requires the `test` status check (GitHub Actions, integration 15368) — where: repository ruleset `main` (id 26033321, active) on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test`; the `test` job of `.github/workflows/ci.yml` runs on `pull_request`; owner: repository admin (`panz3r`).
- Merging into `main` requires one approving review, squash merge only — where: repository ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; branch protection is not used (`gh api repos/panz3r/fijih-sample/branches/main/protection` answered 404 "Branch not protected"); AGENTS.md and TEAMS.md assign the approval to the QA Engineer `duckyduff369`; owner: repository admin (`panz3r`).

This change adds, removes, or renames no CI check context.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts

## Implementation Record

Task 1 — Shared: tag model and normalisation. Added `Bookmark.tags`, `NewBookmark.tags?: unknown`, and pure `normalizeTags` (returns `string[]`, or `null` for an invalid tag). Judged on the trimmed, lower-cased tag; length counts code points. Focused: `pnpm --filter @sample/shared test` 9 passed, typecheck passed.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-29 — Plan: drafted from FIJIH-49 revision `2026-10-29T17:44:20.074+0100`; issue assigned to the current user. Open decisions D1 to D6 await plan approval.
- 2026-10-29 — Approved: plan-approval — Approve. Answers: D1 no tag input on the add form; D2 yes, 400 invalid tag; D3 yes, 400 invalid tag; D4 yes to both; D5 yes, join with ", "; D6 leave README.md unchanged.
- 2026-10-29 — Implementation: task 1 done (shared tag model and `normalizeTags`).

