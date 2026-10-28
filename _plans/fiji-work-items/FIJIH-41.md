---
schema: fiji/work-item/v1
id: FIJIH-41
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-41
  revision: "2026-10-28T18:30:03.635+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-41-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-41: Add tags to bookmarks

## Story

As a user who saves bookmarks,
I want each bookmark to carry an optional list of tags that the API accepts and returns and the page shows next to the title,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-41 "Add tags to bookmarks" (Story, Medium, label `scenario-S1`), revision `2026-10-28T18:30:03.635+0100`. No comments, attachments, links, or Figma references.
- Issue context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue decisions: tags are not filterable yet.
- Issue out of scope: filtering or searching by tag; editing tags of an existing bookmark.
- User decisions (answers to the earlier Plan block, verbatim):
  1. Web add form: "no tags input on the add form in this story". The add form in `packages/web/index.html` and the request body in `packages/web/src/main.ts` stay unchanged.
  2. Malformed tags: "a non-array tags value or a non-string entry answers 400 {"error":"invalid tag"}".
  3. Empty tags: "a tag that is empty after trimming is rejected with 400 {"error":"invalid tag"}".
- Out of scope, per the issue: tag filtering or search, and editing tags on an existing bookmark (there is no update endpoint). Per user decision 1: a tags input on the add form.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field. When it is absent, the created bookmark has `tags: []`. When it is an array of strings, the API trims and lower-cases each tag, then removes duplicates (keeping the first occurrence, in input order). The 201 response body includes the resulting `tags`. Example: `["  News ", "news", "Tech"]` is stored as `["news", "tech"]`.
2. `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores no bookmark when any of these is true:
   - `tags` is present but is not an array. This includes `null`, a string, a number, and an object.
   - Any entry is not a string.
   - Any tag is empty after trimming.
   - Any tag is longer than 32 characters after trimming.
   - Any tag contains whitespace after trimming.

   A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns a `tags` array on every bookmark: the normalized tags from creation, or `[]`.
4. The web page shows each bookmark's tags after its title as one comma-separated text (`news, tech`). For a bookmark with no tags it renders no tag text and no tag element.
5. Vitest unit tests cover the new behaviour in each package:
   - `packages/shared`: normalization and validation.
   - `packages/api`: the POST and GET tags behaviour, including every 400 case in AC 2.
   - `packages/web`: tags rendered and tags absent.
6. The change follows the repository's release conventions:
   - A changeset in `.changeset/` names the changed packages, with the summary "Add tags to bookmarks".
   - `measure/baseline.json` holds the `web_bundle_gzip_bytes` that `pnpm build && pnpm measure` prints on the branch.
   - `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [ ] `packages/shared`: add tags to the model, plus a pure normalize-and-validate helper (AC: 1, 2, 5)
  - [ ] Add `tags: string[]` to `Bookmark`. Let `NewBookmark` take optional `tags?: unknown` input, or add an equivalent input type.
  - [ ] Add a helper, such as `normalizeTags(value: unknown): string[] | null`. It returns `[]` for `undefined` and the trimmed, lower-cased, de-duplicated list (first occurrence kept) for a valid array. For every invalid case in AC 2 it signals failure.
  - [ ] Add tests in `packages/shared/src/index.test.ts`:
    - absent input gives `[]`
    - trim, lower-case, and dedupe, with order kept
    - a tag of exactly 32 characters is accepted and one of 33 is rejected
    - a tag with inner whitespace is rejected
    - a tag that is empty after trimming is rejected
    - a non-array value (including `null`) is rejected
    - a non-string entry is rejected
- [ ] `packages/api`: accept, validate, store, and return tags (AC: 1, 2, 3, 5)
  - [ ] In `app.ts`, pass `body.tags` through to `store.add` unchanged. Do not coerce it.
  - [ ] In `store.ts`, call the shared helper and throw `ValidationError("invalid tag")` on failure, before checking for a duplicate URL and before storing. Store the normalized `tags` on the bookmark.
  - [ ] Add tests in `packages/api/src/app.test.ts`:
    - without `tags`, POST gives `tags: []` in both the 201 response and the GET response
    - with tags, POST normalizes them, and GET returns them
    - each 400 case in AC 2 answers `{"error":"invalid tag"}` and adds nothing to `GET /bookmarks`
- [ ] `packages/web`: render tags after the title (AC: 4, 5)
  - [ ] In `render.ts`, after the link, append an element (for example `<span class="tags">`) whose text is `tags.join(", ")`. Append it only when `tags.length > 0`.
  - [ ] Update the existing fixtures in `render.test.ts` for the new required `tags` field. Add tests for a bookmark with tags (text `news, tech`, placed after the title link) and for a bookmark with no tags (no tag element, and the item text has no tag text).
  - [ ] Leave the add form (`index.html`) and the POST body in `main.ts` unchanged (user decision 1).
- [ ] Release conventions (AC: 6)
  - [ ] Run `pnpm build`, then `pnpm measure`. When `web_bundle_gzip_delta` is not 0, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in the same change.
  - [ ] Add a changeset (`pnpm changeset`) for `@sample/shared`, `@sample/api`, and `@sample/web` with the summary "Add tags to bookmarks".
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the root, and record the results.

## Engineering Context

- Workspace: pnpm. `@sample/shared` holds types and pure functions, and the `api` and `web` packages import it from source. Tests use Vitest in each package. The web tests run against a DOM (`render.test.ts` uses `document`).
- Controlling code:
  - `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark`, and the URL helpers.
  - `packages/api/src/store.ts`: `BookmarkStore.add` validates input and throws `ValidationError`, which `app.ts` maps to `400 {"error": message}`.
  - `packages/api/src/app.ts`: parses the POST body.
  - `packages/web/src/render.ts`: `renderList`.
- The store keeps bookmarks in memory only, so there is no persisted data to migrate. Every bookmark created after this change has `tags`.
- Validation order in `store.add`:
  - Title and URL keep their current checks and messages.
  - The tag check runs before the duplicate-URL check, so a request with invalid tags never stores a bookmark.
  - A request that has both an invalid title or URL and invalid tags answers with the first failing check. The tests send otherwise-valid bodies.
- Normalization order: trim, then validate (not empty, at most 32 characters, no whitespace matching `/\s/`), then lower-case, then dedupe. Lower-casing does not change the length of ASCII tags, so the length check gives the same result before or after lower-casing for the cases tested.
- Planning choices made within the criteria (not product decisions; they can be changed at plan approval):
  - Duplicates keep the first occurrence, in input order.
  - `null` counts as a non-array value, so it answers 400. Only an absent `tags` defaults to `[]`.
  - The tag text is joined with `", "`.
- No Figma, analytics, or translation surfaces exist in this repository.

## Testing Strategy

- Unit tests (Vitest), one set per package (AC 5):
  - shared: happy, boundary, and unhappy tag inputs.
  - api: HTTP-level POST and GET with tags, including every 400 case.
  - web: rendering with and without tags.
- Integration: the api tests exercise the real `createApp` HTTP server against the shared helper, so they cover the api-to-shared path.
- Regression: the existing tests keep passing. The web fixtures change only to add `tags`.
- Root checks: `pnpm test`, `pnpm lint`, and `pnpm typecheck`. CI runs the same checks on the pull request, and the required `test` job runs `pnpm test`.
- Bundle size: `pnpm build && pnpm measure` locally, with the baseline updated when the size moves (AC 6). The CI `measure` job reports the same number, but no criterion depends on CI alone.
- There are no manual or end-to-end checks beyond the tasks above.

## Operational Requirements

- Merging into `main` requires the `test` status check to pass and 1 approving review, with squash merge only. These rules come from the repository ruleset "main" (id 26033321).
  - Where: GitHub repository ruleset on `panz3r/fijih-sample`.
  - Evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` `[{"context":"test","integration_id":15368}]` and `pull_request` `required_approving_review_count: 1` with `allowed_merge_methods: ["squash"]`. `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected", so classic branch protection adds no rules.
  - Owner: repository admin `panz3r`.
  - This change adds, removes, and renames no CI check contexts.
- The required approval comes from the Bookmarks team's QA Engineer `duckyduff369` (TEAMS.md).
  - Where: TEAMS.md and the GitHub reviewers on the pull request.
  - Evidence: TEAMS.md (in-repository), read during Plan.
  - Owner: the Bookmarks team.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Plan drafted from FIJIH-41 at revision `2026-10-28T18:30:03.635+0100`. It records the user's three answers to the earlier Plan block (no tags input on the add form; a non-array value or a non-string entry answers 400 invalid tag; a tag that is empty after trimming answers 400 invalid tag).
- 2026-10-28: Approved: plan-approval — approve
