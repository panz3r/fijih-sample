---
schema: fiji/work-item/v1
id: FIJIH-78
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-78
  revision: 2026-11-03T13:41:58.714+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-78-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-78: Add tags to bookmarks

## Story

As a user,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira story FIJIH-78 "Add tags to bookmarks" (no comments, no attachments, no Figma link).
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision recorded in the issue: "Tags are not filterable yet."
- Out of scope per the issue: filtering or searching by tag; editing the tags of an existing bookmark.
- Open questions (see Engineering Context, "Open decisions"): whether the web Add form gets a tags input, and how the API treats malformed `tags` values and empty tags.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed, then lower-cased, and duplicates are removed (the first occurrence keeps its position). When `tags` is omitted, the bookmark is stored with `tags: []`. The `201` response body includes the normalized `tags`.
2. When any tag, after trimming, is longer than 32 characters or contains whitespace, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores no bookmark.
3. `GET /bookmarks` returns each bookmark with its `tags` array.
4. The web page shows each bookmark's tags after its title, joined by `, ` (for example `work, reading`), and renders no tag element or text for a bookmark whose `tags` is empty.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [ ] Shared model and tag normalization in `packages/shared` (AC: 1, 2, 5)
  - [ ] Add `tags: string[]` to `Bookmark`; make `NewBookmark` accept an optional `tags?: readonly string[]`.
  - [ ] Add a pure `normalizeTags` function (with a `MAX_TAG_LENGTH = 32` constant) that trims, lower-cases, and deduplicates in first-occurrence order, and reports an invalid tag (longer than 32 characters or containing whitespace after trimming) to its caller, for example by returning `null`.
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication order, empty input, a 32-character tag accepted, a 33-character tag rejected, an inner space or tab rejected.
- [ ] API accepts, validates, stores, and returns tags in `packages/api` (AC: 1, 2, 3, 5)
  - [ ] `BookmarkStore.add` normalizes `input.tags` (default `[]`) with `normalizeTags`, throws `ValidationError("invalid tag")` for an invalid tag before any duplicate-URL check or insert, and stores the normalized tags on the bookmark.
  - [ ] `createApp` passes `body.tags` from the `POST /bookmarks` body to the store.
  - [ ] Unit tests in `store.test.ts` (normalized tags stored, default `[]`, invalid tag throws and stores nothing) and `app.test.ts` (`POST` with tags returns `201` with normalized tags, `POST` with an invalid tag returns `400 {"error":"invalid tag"}`, `GET /bookmarks` returns each bookmark's tags, `POST` without tags returns `tags: []`).
- [ ] Web page shows tags in `packages/web` (AC: 4, 5)
  - [ ] `renderList` appends, after the title link, an element whose text is the bookmark's tags joined by `, `, only when the bookmark has at least one tag.
  - [ ] Unit tests in `render.test.ts`: tags shown comma separated after the title; no tag element when `tags` is `[]`. Update the existing fixtures to include `tags`.
- [ ] Bundle size baseline (AC: 4)
  - [ ] Run `pnpm build` then `pnpm measure`; if `web_bundle_gzip_delta` is not `0`, set `measure/baseline.json` `web_bundle_gzip_bytes` to the measured value in this change, per `AGENTS.md`.
- [ ] Repository checks (AC: 5)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results in Validation Evidence.

## Engineering Context

- Workspace: pnpm; `packages/shared` (types and pure functions) is imported from source by `packages/api` and `packages/web` as `@sample/shared`.
- `packages/shared/src/index.ts` holds `Bookmark`, `NewBookmark`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. Tag normalization belongs here as a pure function so both the API and its tests reuse it.
- `packages/api/src/store.ts` `BookmarkStore.add` validates title, then URL, then duplicate URL, and throws `ValidationError` with the client-facing message; `packages/api/src/app.ts` maps `ValidationError` to `400 {"error": <message>}`, so `ValidationError("invalid tag")` yields the required body without changing `app.ts` error handling. `POST /bookmarks` currently reads only `url` and `title` from the body.
- `packages/web/src/render.ts` `renderList` builds each `<li>` as title link plus Remove button; `index.html` styles `li` as `display: flex; justify-content: space-between`, so a tags element placed between the link and the button stays after the title. `packages/web/src/main.ts` posts only `title` and `url`, which keeps working because `tags` defaults to `[]`.
- Changing `Bookmark` to require `tags` changes the type of every `Bookmark` literal (existing web test fixtures, store construction); typecheck catches each one.
- Release: a changeset (`pnpm changeset`) is required for the pull request per `AGENTS.md`; Delivery adds it with the summary "Add tags to bookmarks".
- Open decisions (asked under `risks` in the Plan result; recorded here until answered):
  - Whether the web Add form (`index.html`, `main.ts`) gets a tags input. The issue names only showing tags; without an input, tags can be added only through the API.
  - The response for a `tags` value that is not an array, or an array holding a non-string, and for a tag that is empty after trimming (`""` or `"  "`).

## Testing Strategy

- Unit (Vitest), per package, as the issue requires:
  - `packages/shared`: `normalizeTags` happy paths (trim, lower-case, dedupe order, empty list) and unhappy paths (33 characters, inner whitespace), plus the 32-character boundary.
  - `packages/api`: store-level tests for storing, defaulting, and rejecting tags; HTTP-level tests through `createApp` on an ephemeral port for `POST` (201 with tags, 400 invalid tag, no tags) and `GET` returning tags.
  - `packages/web`: `renderList` in jsdom for tags present and tags absent.
- Integration: the API HTTP tests in `app.test.ts` exercise shared normalization through the store and the HTTP layer together.
- No migration: the store is in memory.
- No manual, live-app, or end-to-end check is planned; the issue asks for unit tests only.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`; bundle size with `pnpm build` then `pnpm measure`.

## Operational Requirements

- Required status check `test` (GitHub Actions, `ci` workflow `test` job) must pass on the pull request — where: repository ruleset `main` (id 26033321, active, targets the default branch); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returned rule `required_status_checks` with context `test` (integration_id 15368); owner: repository admin (`panz3r`).
- One approving review is required before merge, and only squash merges are allowed — where: repository ruleset `main` (id 26033321); evidence: same call returned rule `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection applies — where: `main` branch protection; evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned `404 Branch not protected`; owner: repository admin (`panz3r`).
- This change adds, removes, or renames no CI check context.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- Drafted from Jira FIJIH-78 at revision 2026-11-03T13:41:58.714+0100.
