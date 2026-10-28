---
schema: fiji/work-item/v1
id: FIJIH-42
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-42
  revision: "2026-10-28T18:58:41.144+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
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
- Decisions (from the user at `plan-approval`, conditional approval of 2026-10-28):
  1. The add form on `packages/web/index.html` / `src/main.ts` gets no tags input; tags are set through the API only.
  2. A `tags` value that is not an array, or an array holding a non-string entry, answers 400 `{"error":"invalid tag"}` (AC 9).
  3. A tag that is empty after trimming is rejected with 400 `{"error":"invalid tag"}`; the 32-character and whitespace checks apply after trimming and lower-casing (AC 10).
  4. Open pull request [#4](https://github.com/panz3r/fijih-sample/pull/4) "[FIJIH-41] Add tags to bookmarks" is a test run that will be closed; this item does not stack on it and its base stays `main`.

## Acceptance Criteria

1. `POST /bookmarks` with `"tags": [" Work ", "work", "READ"]` answers 201 and the created bookmark has `"tags": ["work", "read"]`: each tag is trimmed and lower-cased, and duplicates after that are removed, keeping the first occurrence's order.
2. `POST /bookmarks` without a `tags` field answers 201 and the created bookmark has `"tags": []`; `"tags": []` gives the same result.
3. `POST /bookmarks` with any tag longer than 32 characters after trimming answers 400 with exactly `{"error":"invalid tag"}` and stores nothing; a 32-character tag is accepted.
4. `POST /bookmarks` with any tag that contains whitespace after trimming (for example `"two words"` or `"a\tb"`) answers 400 with exactly `{"error":"invalid tag"}` and stores nothing.
5. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the normalised tags it was created with.
6. The web page shows each bookmark's tags after its title link, joined by `", "` (for example `work, read`), and renders no tag text or tag element when the bookmark has no tags.
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, 9, and 10, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. The change follows the delivery conventions in `AGENTS.md`: a changeset in `.changeset/` for `@sample/shared`, `@sample/api`, and `@sample/web` with summary `Add tags to bookmarks`, and `measure/baseline.json` updated to the `web_bundle_gzip_bytes` that `pnpm build` then `pnpm measure` prints, when the change moves it.
9. `POST /bookmarks` with a `tags` value that is not an array (for example `"work"`, `null`, or `{}`) or an array with any non-string entry (for example `[1]` or `["a", null]`) answers 400 with exactly `{"error":"invalid tag"}` and stores nothing.
10. `POST /bookmarks` with any tag that is empty after trimming (`""` or `"   "`) answers 400 with exactly `{"error":"invalid tag"}` and stores nothing; the length (AC 3) and whitespace (AC 4) checks apply to each tag after trimming and lower-casing.

## Tasks and Subtasks

- [x] Shared model and tag rules (AC: 1, 2, 3, 4, 7, 10)
  - [x] In `packages/shared/src/index.ts`, add `tags: string[]` to `Bookmark` and an optional `tags?: readonly string[]` to `NewBookmark`.
  - [x] Add a pure `normalizeTags(tags: readonly string[]): string[]` that trims, lower-cases, and deduplicates keeping first-occurrence order.
  - [x] Add a pure `isValidTag(tag: string): boolean` that is false for a normalised (trimmed, lower-cased) tag that is empty, longer than 32 characters, or containing whitespace (`/\s/`).
  - [x] Tests in `packages/shared/src/index.test.ts`: normalisation and order, dedup across case and padding, empty input, empty and whitespace-only tags invalid, 32 vs 33 characters, internal space and tab.
- [x] API accepts, validates, stores, and returns tags (AC: 1, 2, 3, 4, 5, 7, 9, 10)
  - [x] In `packages/api/src/app.ts`, read `tags` from the POST body and pass it to `store.add`.
  - [x] In `packages/api/src/store.ts`, default a missing (`undefined`) `tags` to `[]`, throw `ValidationError("invalid tag")` when `tags` is present but not an array or holds a non-string entry (before calling `normalizeTags`, so no 500), normalise with `normalizeTags`, throw `ValidationError("invalid tag")` when any normalised tag fails `isValidTag` (including empty after trimming) (after the existing title and url checks, before the duplicate-url check), and store `tags` on the bookmark.
  - [x] Tests in `packages/api/src/app.test.ts`: POST with tags (normalised in the 201 body), POST without tags (`[]`), 33-character tag, whitespace tag, empty and whitespace-only tags, non-array `tags` (`"work"`, `null`), and non-string entry (`[1]`) each answer 400 `{"error":"invalid tag"}` and the list does not grow; a 32-character tag that has upper-case padding is checked after trimming and lower-casing; GET returns tags.
- [x] Web page shows tags after the title (AC: 6, 7)
  - [x] In `packages/web/src/render.ts`, append a `<span class="tags">` with `bookmark.tags.join(", ")` after the link only when `bookmark.tags.length > 0`.
  - [x] Update existing fixtures in `packages/web/src/render.test.ts` for the new required `tags` field, and add tests: tags shown after the title as `work, read`; no `.tags` element and no extra text when `tags` is `[]`.
- [x] Delivery conventions (AC: 7, 8)
  - [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root.
  - [x] Run `pnpm build` then `pnpm measure`; update `measure/baseline.json` `web_bundle_gzip_bytes` when the value moved.
  - [x] Add `.changeset/<name>.md` bumping `@sample/shared`, `@sample/api`, and `@sample/web` (minor) with summary `Add tags to bookmarks`.

## Engineering Context

- Workspace: `packages/shared` holds types and pure functions and is imported from source by `packages/api` and `packages/web` (`exports: { ".": "./src/index.ts" }`).
- `packages/shared/src/index.ts`: `Bookmark { id, url, title, createdAt }`, `NewBookmark = Pick<Bookmark, "url" | "title">`, plus `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. New tag helpers belong here, matching the existing pure-function style with a one-line doc comment.
- `packages/api/src/store.ts`: `BookmarkStore.add` validates title, then url, then duplicate url, throwing `ValidationError(message)`; `packages/api/src/app.ts` maps `ValidationError` to 400 `{ error: message }`, so `ValidationError("invalid tag")` yields the required body without changing `app.ts` error handling. The store is in memory; there is no persisted data to migrate.
- `packages/api/src/app.ts` POST handler casts the body to `{ url?: string; title?: string }`; extend the cast with `tags?: unknown` and pass it on. Malformed `tags` (not an array, non-string elements) answers 400 `{"error":"invalid tag"}` per decision 2; the store must check the shape before `normalizeTags`, which would otherwise throw a non-`ValidationError` that `app.ts` answers with 500.
- `packages/web/src/render.ts`: `renderList` builds `<li><a/>…<button>Remove</button></li>`; the tags span goes between the link and the Remove button. `index.html` styles `li` as a flex row with `space-between`; no style change is required by the criteria.
- `packages/web/src/main.ts` sends only `title` and `url` on submit; per decision 1 it is not changed: the add form gets no tags input.
- Making `Bookmark.tags` required is a type change that every `Bookmark` literal must follow (the fixture in `render.test.ts`); `typecheck` catches the rest.
- Per decision 3: the empty, length, and whitespace checks apply to each tag after trimming and lower-casing; length is the JavaScript string length.
- Per decision 4: base branch stays `main` (`artifacts.base_branch: null`); no stacking on PR #4. Closing #4 is the user's action and is not part of this item.

### Defaults taken at plan approval

- `tags: null` — treated as present and not an array, so it answers 400 `{"error":"invalid tag"}` (only a missing field defaults to `[]`).
- Tests use Vitest; `packages/web` runs in `jsdom` (`vite.config.ts`). API tests start the real server on an ephemeral port and use `fetch`.
- Conventions: branch `FIJIH-42-add-bookmark-tags`; Conventional Commits, one logical change per commit (for example `feat:` shared model, `feat:` API, `feat:` web, `chore:` changeset and baseline).

## Testing Strategy

- Unit (shared): `normalizeTags` happy paths (trim, lower-case, dedup, order, empty array) and `isValidTag` boundaries (32 accepted, 33 rejected, empty rejected, space, tab, newline rejected).
- Integration (api): HTTP round-trips through `createApp` for AC 1–5, 9, and 10, including the 400 body equality `{"error":"invalid tag"}` for malformed `tags` and empty-after-trim tags, and that a rejected POST stores nothing.
- Unit (web): `renderList` DOM output with tags and without tags.
- Regression: existing tests in all three packages keep passing after the `Bookmark` type change.
- Commands: `pnpm --filter @sample/shared test`, `pnpm --filter @sample/api test`, `pnpm --filter @sample/web test`, then `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root; `pnpm build` and `pnpm measure` for the baseline.
- No manual, live-app, or end-to-end check is planned; the issue asks for unit tests only.

## Operational Requirements

- Required status check `test` (job `test` of `.github/workflows/ci.yml`, integration id 15368) on `main` — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned a `required_status_checks` rule with context `test`; owner: repository admin `panz3r`. This change adds, removes, and renames no check contexts.
- Pull request rule on `main`: one approving review, squash merge only — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin `panz3r`. Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No environments, secrets, deploy configuration, or other repositories are involved; the `ci` workflow runs on every `pull_request`.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/app.ts
- packages/api/src/store.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- .changeset/add-bookmark-tags.md
- measure/baseline.json
- _plans/fiji-work-items/FIJIH-42.md
## Implementation Record

- Task 1 (shared): added `tags` to `Bookmark`, optional `tags` on `NewBookmark`, `normalizeTags` (Set-based dedup after trim/lower-case) and `isValidTag` (non-empty, <=32, no `\s`). `pnpm --filter @sample/shared test` 10 passed; shared lint and typecheck passed.
- Task 2 (api): `store.add` takes `tags?: unknown`; `parseTags` defaults undefined to `[]`, throws `ValidationError("invalid tag")` for a non-array, a non-string entry (null included), or any normalised tag failing `isValidTag`; it runs after the title and url checks and before the duplicate-url check. `app.ts` passes `body.tags`. API tests 16 passed; api lint and typecheck passed.
- Task 3 (web): `renderList` appends `<span class="tags">` between the link and Remove only when tags exist; fixtures updated; two new tests. Web tests 4 passed; web lint and typecheck passed.
- Task 4 (delivery): root `pnpm test`, `pnpm lint`, `pnpm typecheck` passed. `pnpm build` then `pnpm measure` printed web_bundle_gzip_bytes=881 (delta 46 over 835); baseline updated to 881. Changeset `.changeset/add-bookmark-tags.md` bumps shared, api, web (minor) with `Add tags to bookmarks`.

## Validation Evidence

- AC-1: passed — api test "normalises tags and returns them from POST and GET"; shared `normalizeTags` tests.
- AC-2: passed — api test "defaults tags to an empty array" (missing and `[]`).
- AC-3: passed — api test rejects 33 characters with 400 and stores nothing; 32 characters (padded, upper-case) accepted; shared 32/33 boundary tests.
- AC-4: passed — api tests for internal space and tab; shared `isValidTag` tests.
- AC-5: passed — api test checks GET returns normalised tags.
- AC-6: passed — web tests: `work, read` in `.tags` right after the link; no `.tags` element or extra text when empty.
- AC-7: passed — tests in shared (10), api (16), web (4); root `pnpm test`, `pnpm lint`, `pnpm typecheck` pass.
- AC-8: passed — changeset added; baseline moved 835 to 881 and was updated.
- AC-9: passed — api tests: string, null, object, `[1]`, `["a", null]` each 400 `{"error":"invalid tag"}`, list unchanged.
- AC-10: passed — api tests: `""` and `"   "` rejected; length/whitespace checks apply after trim and lower-case.

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Drafted from FIJIH-42 at revision 2026-10-28T18:58:41.144+0100 (issue assigned to Mattia Panzeri during Plan).
- 2026-10-28: Scope change: "approve, with these answers: (1) no tags input on the add form; (2) yes, a non-array tags value or a non-string entry answers 400 {"error":"invalid tag"}; (3) a tag empty after trimming is rejected with 400, and the 32-character and whitespace checks apply after trimming and lower-casing; (4) PR #4 is a test run that will be closed, so do not stack on it." — plan-approval (conditional approval) at 701fea4. Added AC 9 and AC 10 (the issue's own criteria are unchanged), mapped tasks and Testing Strategy, recorded answers 1 and 4 in Product Context and Engineering Context, and removed the four open questions. Default recorded for `tags: null`.
- 2026-10-28: Approved: plan-approval — conditional: approve, with these answers: (1) no tags input on the add form; (2) yes, a non-array tags value or a non-string entry answers 400 {"error":"invalid tag"}; (3) a tag empty after trimming is rejected with 400, and the 32-character and whitespace checks apply after trimming and lower-casing; (4) PR #4 is a test run that will be closed, so do not stack on it. (verified at 7c487697fa7260083300859e35d70b7227713b30)
- 2026-10-28: Implementation complete: tasks 1-4 checked off; AC 1-10 evidenced; checkpoint implementation-approval. Jira FIJIH-42 moved To Do to In Progress.
