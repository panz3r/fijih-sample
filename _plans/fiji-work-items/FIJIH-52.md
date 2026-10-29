---
schema: fiji/work-item/v1
id: FIJIH-52
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-52
  revision: 2026-10-29T19:10:08.049+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-52-add-tags
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-52: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group related bookmarks.

## Product Context

- Source: Jira FIJIH-52 (Story, Medium, label `scenario-S1`), no comments, no attachments, no Figma link. The issue holds all the product context.
- Context in the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions in the issue: tags are not filterable yet.
- Out of scope in the issue: filtering or searching by tag; editing tags of an existing bookmark.
- Open product questions (see the risks in the Plan result, and Engineering Context > Open questions): a tags input in the web add form, non-array or non-string `tags` values, empty tags, and how the trim and the whitespace and length rules combine.

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings stores each tag trimmed and lower-cased, with duplicates removed after normalization, in first-occurrence order. Example: `["  Work ", "work", "READ"]` is stored and returned as `["work", "read"]`. The 201 response body includes `tags`.
2. `POST /bookmarks` without `tags` stores and returns `tags: []`.
3. `POST /bookmarks` with a tag that, after trimming, is longer than 32 characters or still contains whitespace answers 400 with body `{"error":"invalid tag"}` and stores nothing. A 32-character tag is accepted; a 33-character tag is rejected; `"a b"` is rejected; `" ab "` is accepted as `"ab"`.
4. `GET /bookmarks` returns a `tags` array on every bookmark (`[]` when it has none), in stored order.
5. The web list shows each bookmark's tags after its title, joined with `", "` (for example `work, read`), and renders no tag element or text for a bookmark with no tags.
6. Vitest tests cover the new behaviour in `packages/shared`, `packages/api`, and `packages/web`, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [ ] Add tag support to `packages/shared` (AC: 1, 3, 6)
  - [ ] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [ ] Add a pure tag helper (for example `normalizeTags(values)`, returning the trimmed, lower-cased, deduplicated tags in first-occurrence order, and `isValidTag(tag)`, false for more than 32 characters or any whitespace character). Export both from `src/index.ts`.
  - [ ] Add tests in `src/index.test.ts`: trim, lower-case, dedupe after normalization, order kept, the 32/33-character boundary, interior whitespace rejected, the input not mutated.
- [ ] Accept, validate, store, and return tags in `packages/api` (AC: 1, 2, 3, 4, 6)
  - [ ] In `src/app.ts`, pass `body.tags` from the POST body to the store.
  - [ ] In `src/store.ts` `add`, normalize the tags with the shared helper, throw `ValidationError("invalid tag")` when any tag is invalid (before the bookmark is stored), default to `[]`, and save `tags` on the bookmark.
  - [ ] Add tests in `src/app.test.ts`: POST with tags (normalized in the 201 body), POST without tags (`[]`), GET returns the tags of each bookmark, a 33-character tag and a tag with interior whitespace each answer 400 `{"error":"invalid tag"}`, and a rejected POST adds nothing to the list.
- [ ] Show tags in `packages/web` (AC: 5, 6)
  - [ ] In `src/render.ts`, after the title link, append an element (for example `<span class="tags">`) holding `bookmark.tags.join(", ")` only when the bookmark has tags.
  - [ ] Update the fixtures in `src/render.test.ts` to the new `Bookmark` type, and add tests: tags shown after the title, comma separated; no tag element and no extra text when `tags` is empty.
- [ ] Record the release work (AC: 6)
  - [ ] Add a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary `Add tags to bookmarks`.
  - [ ] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_bytes` differs from `measure/baseline.json` (835), update the baseline in this change and record both numbers in Validation Evidence.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results (AC: 6)

## Engineering Context

- Workspace: pnpm with `packages/shared` (types and pure functions, imported from source by the other two), `packages/api` (Node `http` service with an in-memory `BookmarkStore`), and `packages/web` (Vite page, Vitest with jsdom).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, and the existing pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). The tag helpers belong here, following the same style.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates the title and URL and throws `ValidationError(message)`. `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` gives the required body with no change to the error handling.
  - `packages/api/src/app.ts`: the POST handler casts the body to `{ url?: string; title?: string }` and builds the store input. Extend the cast with `tags`.
  - `packages/web/src/render.ts`: `renderList` builds `<li>` with a title link and a Remove button. `packages/web/src/main.ts` fetches `/bookmarks` and posts the add form (title and URL only).
  - `packages/web/index.html`: `li` is `display: flex; justify-content: space-between`, so a tags element between the link and the button sits in the middle of the row. No style change is required by the criteria.
- Storage is in memory only, so there is no data migration. Every bookmark created after this change has `tags`.
- Making `Bookmark.tags` required changes the type that `render.test.ts` fixtures use; update them, or the web type-check fails.
- Validation runs on the normalized tag (after trim and lower-case), so leading and trailing whitespace is accepted and trimmed, while interior whitespace is rejected (AC 3). Whitespace means any character that matches `/\s/`. Length is counted on the normalized tag.
- Conventions (AGENTS.md): branch `FIJIH-52-add-tags`; Conventional Commits, one logical change per commit, subject under 72 characters (for example `feat: add tag helpers to shared`, `feat: accept and return bookmark tags in the api`, `feat: show bookmark tags on the web page`, `chore: add changeset for bookmark tags`); every behaviour change has a Vitest test in the package it changes; a changeset is required because packages change; the bundle baseline moves in the same pull request that knowingly moves it.

### Open questions

These are product decisions that neither the issue nor the project instructions settle. They are asked in the Plan result's risks; the plan above does not decide them.

1. Web add form: the issue says the page shows tags, but does not say whether the add form (`packages/web/index.html`, `src/main.ts`) gets a tags input. Is a tags input in scope? If yes, what format (for example one comma-separated field)? The plan does not add one.
2. Malformed `tags`: when `tags` is not an array, or holds a non-string item, should the API answer 400 `{"error":"invalid tag"}`, another error message, or ignore it?
3. Empty tags: is a tag that is empty after trimming (`""` or `"   "`) rejected with `invalid tag`, or dropped silently?
4. Trim and validation order: the plan reads the issue as trim first, then validate (so `" ab "` is accepted as `"ab"` and only interior whitespace is rejected), with the 32-character limit counted on the trimmed tag. Confirm this reading.

## Testing Strategy

- `packages/shared` (Vitest, `src/index.test.ts`): unit tests for the tag helpers. Happy path: trim, lower-case, dedupe, order kept, empty input gives `[]`. Unhappy path: 33 characters, interior space, tab, and newline are invalid; a 32-character tag is valid.
- `packages/api` (Vitest, `src/app.test.ts`, real HTTP against `createApp()` on an ephemeral port): POST with and without tags, GET returning tags, 400 `{"error":"invalid tag"}` for an over-long tag and for an interior-whitespace tag, and a rejected POST leaving the list unchanged. Tests in this file share one server and store, so each test uses unique URLs to avoid `url already bookmarked`.
- `packages/web` (Vitest with jsdom, `src/render.test.ts`): tags rendered after the title link, comma separated; nothing rendered for `tags: []`.
- Integration: the API tests exercise the shared helper through the store and the HTTP layer. No live-app or end-to-end check is required by the issue.
- Release: `pnpm build` and `pnpm measure` for the bundle size, and a changeset.
- Gates from the repository root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (the same commands CI runs in the `test`, `lint`, and `typecheck` jobs of `.github/workflows/ci.yml`).

## Operational Requirements

- Required status check `test` on `main` (the `test` job of the `ci` workflow, which runs on `pull_request`) — where: repository ruleset `main` (id 26033321, active, target `~DEFAULT_BRANCH`); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returns rule `required_status_checks` with context `test` (integration_id 15368), strict policy false; owner: repository admins of `panz3r/fijih-sample` (`panz3r`).
- One approving review and squash merge only on `main` — where: the same ruleset `main` (id 26033321); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returns rule `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admins (`panz3r`). AGENTS.md and TEAMS.md name the QA Engineer `duckyduff369` as the reviewer whose approval is needed.
- No classic branch protection — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returns 404 "Branch not protected".
- This change adds, removes, and renames no CI check contexts, and needs no secrets, environments, deploy configuration, or other repositories. The repository's only environment, `copilot` (`gh api repos/panz3r/fijih-sample/environments`, no protection rules), is not used by this change.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-29: Drafted from Jira FIJIH-52 at revision 2026-10-29T19:10:08.049+0100 (after assigning the issue to the current user).
