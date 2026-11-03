---
schema: fiji/work-item/v1
id: FIJIH-80
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-80
  revision: 2026-11-03T15:01:02.875+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-80-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-80: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-80 (Story, "Add tags to bookmarks"), revision `2026-11-03T15:01:02.875+0100`, no comments, no attachments, no Figma reference.
- Context (from the issue): a bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- Decisions (from the issue): tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Not named by the issue and not yet decided: whether the web page's add form (`packages/web/index.html`, `packages/web/src/main.ts`) gets a tags input. This plan does not add one; tags can be set only through `POST /bookmarks` until the user decides otherwise (see Risks in the Plan result).

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence's position. When `tags` is absent the bookmark's tags are `[]`. The `201` response body includes the normalized `tags`.
2. A tag that, after trimming, is longer than 32 characters or contains whitespace makes `POST /bookmarks` answer `400` with `{"error":"invalid tag"}`, and no bookmark is stored.
3. Proposed, pending the user's confirmation: `tags` present but not an array, an element that is not a string, or a tag that is empty after trimming also answers `400` with `{"error":"invalid tag"}`, and no bookmark is stored.
4. `GET /bookmarks` returns each bookmark's `tags` array (`[]` for a bookmark created without tags).
5. The web page shows each bookmark's tags after its title, joined with `", "` (for example `news, tech`), and renders no tag text or element when the bookmark has no tags.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [ ] Shared tag model and normalization (AC: 1, 2, 3, 6)
  - [ ] In `packages/shared/src/index.ts`, add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [ ] Add an exported `MAX_TAG_LENGTH = 32` and a pure `normalizeTags(input: unknown): string[] | null` that returns `[]` for `undefined`, the trimmed, lower-cased, first-occurrence-deduplicated list for a valid array, and `null` for any invalid input (AC 2 and the AC 3 cases).
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: trim, lower-case, dedupe (including case-variant duplicates), default `[]`, exactly 32 characters accepted, 33 rejected, inner whitespace (space, tab) rejected, and the AC 3 cases.
- [ ] API accepts, validates, stores, and returns tags (AC: 1, 2, 3, 4, 6)
  - [ ] In `packages/api/src/store.ts`, `add` calls `normalizeTags(input.tags)`, throws `ValidationError("invalid tag")` on `null`, and stores the result on the bookmark.
  - [ ] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add` for `POST /bookmarks`.
  - [ ] Store tests in `packages/api/src/store.test.ts`: default `[]`, normalized tags stored, invalid tag throws and stores nothing.
  - [ ] HTTP tests in `packages/api/src/app.test.ts`: `POST` with tags returns them normalized; `GET` lists them; invalid tag answers `400` `{"error":"invalid tag"}` and `GET` does not list the rejected bookmark; existing tests keep passing.
- [ ] Web page renders tags after the title (AC: 5, 6)
  - [ ] In `packages/web/src/render.ts`, after the link append an element (for example `<span class="tags">`) whose text is the tags joined with `", "`, only when `bookmark.tags.length > 0`.
  - [ ] Tests in `packages/web/src/render.test.ts`: tags shown after the title as `news, tech`; no tag element when tags are `[]`; update the existing fixture with `tags: []` so it type-checks.
- [ ] Root checks and bundle measurement (AC: 6)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root.
  - [ ] Run `pnpm build` then `pnpm measure`; when the gzipped web bundle size moves from `measure/baseline.json` (835 bytes), update `web_bundle_gzip_bytes` there in this change, as `AGENTS.md` requires.

## Engineering Context

- Workspace: pnpm; `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web` (`AGENTS.md`).
- `packages/shared/src/index.ts`: `Bookmark` (`id`, `url`, `title`, `createdAt`), `NewBookmark = Pick<Bookmark, "url" | "title">`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. Tag normalization belongs here as a pure function next to `normalizeUrl`.
- `packages/api/src/store.ts`: `BookmarkStore.add` validates title, URL, and URL uniqueness, throwing `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to `400 { error: message }`, so `ValidationError("invalid tag")` yields the required body. Validate tags after the existing title and URL checks and before the bookmark is stored, so a request invalid in several ways keeps today's error for title and URL.
- `POST /bookmarks` reads the JSON body as an untyped object, so `normalizeTags` takes `unknown` and checks the array and element types at runtime.
- `packages/web/src/render.ts`: `renderList` builds each `<li>` as a link (title) plus a Remove button; `index.html` styles `li` as a flex row with `justify-content: space-between`. Place the tags element between the link and the button. Use `textContent`, never `innerHTML`, for tag text.
- Adding the required `tags` field to `Bookmark` breaks the type of existing fixtures (`packages/web/src/render.test.ts`); update them in the same task.
- The web add form (`index.html`, `main.ts`) is unchanged by this plan (see Product Context).
- Change intent: `AGENTS.md` requires a changeset in `.changeset/` for a pull request that changes a package, summary `Add tags to bookmarks`; Delivery adds it.

## Testing Strategy

- Unit (Vitest), `packages/shared`: `normalizeTags` happy paths (trim, lower-case, dedupe, default), boundaries (32 vs 33 characters), unhappy paths (inner whitespace, AC 3 cases). Run `pnpm --filter @sample/shared test`.
- Unit and HTTP integration (Vitest), `packages/api`: `BookmarkStore` tag storage and rejection; `createApp` over a real listening server for `POST`/`GET` with tags and the `400` body. Run `pnpm --filter @sample/api test`.
- Unit (Vitest, jsdom), `packages/web`: `renderList` tag text and the no-tags case. Run `pnpm --filter @sample/web test`.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; `pnpm build` then `pnpm measure` for the bundle size.
- No migration (in-memory store), no design source, and no manual or live-app check is planned.

## Operational Requirements

- Required status check `test` on `main` — where: repository ruleset `main` (id 26033321, active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test` (integration 15368), plus a `pull_request` rule requiring 1 approving review and allowing only squash merges; owner: repository admin (`panz3r`). This change adds, removes, or renames no CI check context.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-03: Plan drafted from FIJIH-80 revision `2026-11-03T15:01:02.875+0100`; issue assigned to the current user.
