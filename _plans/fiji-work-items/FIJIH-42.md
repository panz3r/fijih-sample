---
schema: fiji/work-item/v1
id: FIJIH-42
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-42
  revision: "2026-10-28T18:58:41.144+0100"
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-42-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-42: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks and see each bookmark's group next to its title.

## Product Context

- Source: Jira Story [FIJIH-42](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-42) "Add tags to bookmarks", priority Medium, label `scenario-S1`, no comments, no attachments, no linked issues, no Figma URL.
- Context (from the issue): users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title.
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions (from the issue): tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Open questions (also returned as Plan risks; answer at `plan-approval`):
  1. Add form: the issue says the page *shows* tags but does not say the add form on `packages/web/index.html` / `src/main.ts` gets a tags input. Without one, tags can only be set through the API. Is a tags input on the add form in scope? This plan currently leaves it out.
  2. Malformed `tags`: the issue does not say what POST answers when `tags` is present but is not an array, or holds a non-string element (for example `"tags": "work"` or `"tags": [1]`). Proposed: 400 `{"error":"invalid tag"}`. Not yet a criterion.
  3. Empty tags: the issue does not say what happens to a tag that is empty after trimming (`""` or `"   "`). Proposed: 400 `{"error":"invalid tag"}` (the alternative is to drop it silently). Not yet a criterion. This plan reads "containing whitespace" and "longer than 32 characters" as applying to the tag after trimming and lower-casing, so `" Work "` is valid and `"two words"` is not; confirm.
  4. Overlap with FIJIH-41: open pull request [#4](https://github.com/panz3r/fijih-sample/pull/4) "[FIJIH-41] Add tags to bookmarks" (branch `FIJIH-41-add-bookmark-tags`) changes the same files for the same feature. This item branches from `main` and does not stack on it, per the invocation. If #4 merges first, this item conflicts with it or duplicates it. Will #4 be closed (or is it a leftover scenario run), or should this item be rebased on whatever lands?

## Acceptance Criteria

1. `POST /bookmarks` with `"tags": [" Work ", "work", "READ"]` answers 201 and the created bookmark has `"tags": ["work", "read"]`: each tag is trimmed and lower-cased, and duplicates after that are removed, keeping the first occurrence's order.
2. `POST /bookmarks` without a `tags` field answers 201 and the created bookmark has `"tags": []`; `"tags": []` gives the same result.
3. `POST /bookmarks` with any tag longer than 32 characters after trimming answers 400 with exactly `{"error":"invalid tag"}` and stores nothing; a 32-character tag is accepted.
4. `POST /bookmarks` with any tag that contains whitespace after trimming (for example `"two words"` or `"a\tb"`) answers 400 with exactly `{"error":"invalid tag"}` and stores nothing.
5. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the normalised tags it was created with.
6. The web page shows each bookmark's tags after its title link, joined by `", "` (for example `work, read`), and renders no tag text or tag element when the bookmark has no tags.
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. The change follows the delivery conventions in `AGENTS.md`: a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with summary `Add tags to bookmarks`, and `measure/baseline.json` updated to the `web_bundle_gzip_bytes` that `pnpm build` then `pnpm measure` prints, when the change moves it.

## Tasks and Subtasks

- [ ] Shared model and tag rules (AC: 1, 2, 3, 4, 7)
  - [ ] In `packages/shared/src/index.ts`, add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [ ] Add a pure `normalizeTags(tags: readonly string[]): string[]` that trims, lower-cases, and deduplicates keeping first-occurrence order.
  - [ ] Add a pure `isValidTag(tag: string): boolean` that is false for a normalised tag longer than 32 characters or containing whitespace (`/\s/`).
  - [ ] Tests in `packages/shared/src/index.test.ts`: normalisation and order, dedup across case and padding, empty input, 32 vs 33 characters, internal space and tab.
- [ ] API accepts, validates, stores, and returns tags (AC: 1, 2, 3, 4, 5, 7)
  - [ ] In `packages/api/src/app.ts`, read `tags` from the POST body and pass it to `store.add`.
  - [ ] In `packages/api/src/store.ts`, default missing tags to `[]`, normalise with `normalizeTags`, throw `ValidationError("invalid tag")` when any normalised tag fails `isValidTag` (after the existing title and url checks, before the duplicate-url check), and store `tags` on the bookmark.
  - [ ] Tests in `packages/api/src/app.test.ts`: POST with tags (normalised in the 201 body), POST without tags (`[]`), 33-character tag and whitespace tag answer 400 `{"error":"invalid tag"}` and the list does not grow, GET returns tags.
- [ ] Web page shows tags after the title (AC: 6, 7)
  - [ ] In `packages/web/src/render.ts`, append a `<span class="tags">` with `bookmark.tags.join(", ")` after the link only when `bookmark.tags.length > 0`.
  - [ ] Update existing fixtures in `packages/web/src/render.test.ts` for the new required `tags` field, and add tests: tags shown after the title as `work, read`; no `.tags` element and no extra text when `tags` is `[]`.
- [ ] Delivery conventions (AC: 7, 8)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root.
  - [ ] Run `pnpm build` then `pnpm measure`; update `measure/baseline.json` `web_bundle_gzip_bytes` when the value moved.
  - [ ] Add `.changeset/<name>.md` bumping `@sample/shared`, `@sample/api`, and `@sample/web` (minor) with summary `Add tags to bookmarks`.

## Engineering Context

- Workspace: `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web` (`exports: { ".": "./src/index.ts" }`).
- `packages/shared/src/index.ts`: `Bookmark { id, url, title, createdAt }`, `NewBookmark = Pick<Bookmark, "url" | "title">`, plus `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. New tag helpers belong here, matching the existing pure-function style with a one-line doc comment.
- `packages/api/src/store.ts`: `BookmarkStore.add` validates title, then url, then duplicate url, throwing `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` yields the required body without changing `app.ts` error handling. The store is in memory; there is no persisted data to migrate.
- `packages/api/src/app.ts` POST handler casts the body to `{ url?: string; title?: string }`; extend the cast with `tags?: string[]`. Malformed `tags` (not an array, non-string elements) is open question 2; Implementation takes that behaviour from the answer recorded at `plan-approval`, not from an invented default. Today such input would reach `normalizeTags` and could throw a non-`ValidationError`, which `app.ts` answers with 500.
- `packages/web/src/render.ts`: `renderList` builds `<li><a/>…<button>Remove</button></li>`; the tags span goes between the link and the Remove button. `index.html` styles `li` as a flex row with `space-between`; no style change is required by the criteria.
- `packages/web/src/main.ts` sends only `title` and `url` on submit; changing it is open question 1.
- Making `Bookmark.tags` required is a type change that every `Bookmark` literal must follow (the fixture in `render.test.ts`); `typecheck` catches the rest.
- Interpretation recorded for confirmation (open question 3): length and whitespace checks apply to each tag after trimming and lower-casing; length is the JavaScript string length.
- Tests use Vitest; `packages/web` runs in `jsdom` (`vite.config.ts`). API tests start the real server on an ephemeral port and use `fetch`.
- Conventions: branch `FIJIH-42-add-bookmark-tags`; Conventional Commits, one logical change per commit (for example `feat:` shared model, `feat:` API, `feat:` web, `chore:` changeset and baseline).

## Testing Strategy

- Unit (shared): `normalizeTags` happy paths (trim, lower-case, dedup, order, empty array) and `isValidTag` boundaries (32 accepted, 33 rejected, space, tab, newline rejected).
- Integration (api): HTTP round-trips through `createApp` for AC 1–5, including the 400 body equality `{"error":"invalid tag"}` and that a rejected POST stores nothing.
- Unit (web): `renderList` DOM output with tags and without tags.
- Regression: existing tests in all three packages keep passing after the `Bookmark` type change.
- Commands: `pnpm --filter @sample/shared test`, `pnpm --filter @sample/api test`, `pnpm --filter @sample/web test`, then `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; `pnpm build` and `pnpm measure` for the baseline.
- No manual, live-app, or end-to-end check is planned; the issue asks for unit tests only.

## Operational Requirements

- Required status check `test` (job `test` of `.github/workflows/ci.yml`, integration id 15368) on `main` — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`; owner: repository admin `panz3r`. This change adds, removes, and renames no check contexts.
- Pull request rule on `main`: one approving review, squash merge only — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin `panz3r`. Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No environments, secrets, deploy configuration, or other repositories are involved; the `ci` workflow runs on every `pull_request`.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Drafted from FIJIH-42 at revision 2026-10-28T18:58:41.144+0100 (issue assigned to Mattia Panzeri during Plan).
