---
schema: fiji/work-item/v1
id: FIJIH-40
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-40
  revision: "2026-10-28T16:43:21.245+0100"
lifecycle:
  status: active
  phase: implementation
  checkpoint: implementation-approval
  transition: implementation-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-40-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-40: Add tags to bookmarks

## Story

As a user who keeps bookmarks,
I want to give each bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

Source: Jira story FIJIH-40 "Add tags to bookmarks" (no comments, no attachments, no Figma URL). Quoted from the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decisions: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

How this plan reads the issue's acceptance criteria:

- The 32-character and whitespace checks apply to each tag after trimming. If they applied before trimming, a tag with leading or trailing spaces would always fail, and trimming would never change an accepted tag.
- "Whitespace" means any character that matches the JavaScript `\s` class.
- "Longer than 32 characters" counts Unicode code points. A tag of exactly 32 characters is accepted.
- "Comma separated" means the tags joined with `, ` (a comma and a space).

Open product decisions. These are not in the issue, and they are asked at plan approval (see the risks):

1. **Tags input on the add form.** The issue's criteria cover only showing tags on the page. The current add form (`packages/web/index.html`, `packages/web/src/main.ts`) has only Title and URL. Without a new input, tags can be set only through the API. This plan leaves the form unchanged until the user answers.
2. **Malformed `tags` values.** The issue does not say what happens when `tags` is present but is not an array, when the array holds a value that is not a string, or when a tag is empty after trimming. Proposal: each of these answers 400 with `{"error":"invalid tag"}`.
3. **Order of returned tags.** The issue says tags are deduplicated but does not give their order. Proposal: keep the first occurrence of each tag, in the order the client sent them.
4. **README.** The `packages/shared` row in `README.md` lists that package's contents ("URL validation and normalisation, sorting"). After this change, that list would not mention tag normalisation. Should the README row be updated in this change?

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings answers 201. The created bookmark's `tags` holds each tag trimmed and lower-cased, and each resulting tag appears once. For example, `[" News ", "news", "Tech"]` gives exactly the tags `news` and `tech`.
2. `POST /bookmarks` without `tags`, or with `"tags": []`, creates a bookmark whose `tags` is `[]`.
3. `POST /bookmarks` answers 400 with the body `{"error":"invalid tag"}`, and stores no bookmark, when any tag is longer than 32 characters after trimming (for example 33 characters) or contains whitespace after trimming (for example `"two words"`). A tag of exactly 32 characters is accepted.
4. `GET /bookmarks` returns a `tags` array on every bookmark, equal to the tags stored when that bookmark was created.
5. The web page shows each bookmark's tags after its title as one text, joined with `, ` (for example `news, tech`). When a bookmark has no tags, the page renders no tags element and no tags text for it.
6. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–5. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. `measure/baseline.json` holds the gzipped web bundle size that `pnpm build` then `pnpm measure` print on this branch, so the printed `web_bundle_gzip_delta` is `0`.

## Tasks and Subtasks

- [x] Add tags to the shared model and a tag normaliser in `packages/shared/src/index.ts` (AC: 1, 2, 3, 6)
  - [x] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark`
  - [x] Add `MAX_TAG_LENGTH = 32` and a pure `normalizeTags(tags)` function. It trims, lower-cases, and deduplicates the tags, and returns `null` when any tag is invalid (more than 32 code points after trimming, or whitespace inside after trimming)
  - [x] Add tests to `packages/shared/src/index.test.ts`: trim, lower-case, dedupe, empty input, a 32-character tag accepted, a 33-character tag rejected, inner whitespace rejected, input not mutated
- [x] Accept, validate, store, and return tags in the API (AC: 1, 2, 3, 4, 6)
  - [x] `packages/api/src/store.ts`: `add` sets `tags` from `normalizeTags(input.tags ?? [])`, and throws `ValidationError("invalid tag")` when the result is `null`, before the bookmark is stored
  - [x] `packages/api/src/app.ts`: pass the request body's `tags` to `store.add`
  - [x] Add tests to `packages/api/src/app.test.ts`: create with tags (201 body), default `[]` when `tags` is missing, 400 `invalid tag` for 33 characters and for inner whitespace with no bookmark stored, `GET /bookmarks` returns the tags
- [x] Show tags after the title in the web list (AC: 5, 6)
  - [x] `packages/web/src/render.ts`: when `bookmark.tags` is not empty, add a `span.tags` with `tags.join(", ")` directly after the link. Group the link and the span so the existing `li` flex layout keeps them together, away from Remove. When there are no tags, render no span
  - [x] Add tests to `packages/web/src/render.test.ts`: tags joined with `, ` after the title, no tags element when `tags` is `[]`, and add `tags` to the existing fixtures
- [x] Run `pnpm build` then `pnpm measure`, and set `web_bundle_gzip_bytes` in `measure/baseline.json` to the printed size (AC: 7)
- [x] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root, and record the results in Validation Evidence (AC: 6)

## Engineering Context

- **Packages.** `@sample/shared` holds the `Bookmark`/`NewBookmark` types and pure helpers. `@sample/api` and `@sample/web` import it from source (`workspace:*`), so the type change reaches both without a build.
- **API.** `packages/api/src/app.ts` is a plain `node:http` handler. `BookmarkStore.add` in `packages/api/src/store.ts` does all validation by throwing `ValidationError(message)`, and the handler maps that to `400 {"error": message}`. The tag check goes there, before the duplicate-URL check stores anything. The store is in memory only, so existing data needs no migration.
- **Web.** `renderList` in `packages/web/src/render.ts` builds the DOM directly, and its tests run under jsdom (`packages/web/vite.config.ts`). In `packages/web/index.html`, each `li` uses `display: flex; justify-content: space-between`. A third child placed directly in the `li` would sit apart from the title, so the tags `span` goes into one wrapper with the link. `textContent` is used for the tags, so tag text is never parsed as HTML.
- **Out of scope** (from the issue): filtering or searching by tag, and editing the tags of an existing bookmark. The add form is unchanged unless open decision 1 says otherwise.
- **Change intent.** Under `AGENTS.md`, the pull request adds a changeset whose summary is `Add tags to bookmarks`, for `@sample/shared`, `@sample/api`, and `@sample/web`. Delivery adds it (`fiji-deliver-change`). It is not an Implementation task.
- **Conventions.** Branch `FIJIH-40-add-bookmark-tags`. Conventional Commits (`feat:`, `test:`, `chore:`), one logical change per commit. Pull request title `[FIJIH-40] Add tags to bookmarks`, label `enhancement` (the issue is a Story), reviewer `duckyduff369` (the QA Engineer in `TEAMS.md`).

## Testing Strategy

- **Unit (shared).** Cover `normalizeTags` happy paths (trim, lower-case, dedupe, empty) and unhappy paths (33 code points, inner space or tab). Cover the 32-character boundary.
- **Integration (api).** `app.test.ts` already starts the real HTTP server on an ephemeral port. Extend it for: create with tags, the default `[]`, 400 `invalid tag` with nothing stored (a follow-up `GET` does not list it), and `GET` returning tags. Use URLs that no existing test uses, because the store is shared across the file.
- **DOM (web).** Use jsdom tests of `renderList`. Check the tags text after the link, check that no tags element exists when there are no tags, and keep the empty-state and Remove tests passing.
- **Repository checks.** `pnpm test`, `pnpm lint`, and `pnpm typecheck` run from the root, the same commands CI's `test`, `lint`, and `typecheck` jobs run.
- **Bundle size.** `pnpm build` then `pnpm measure` runs locally (AC 7). CI's `measure` job prints the same number but never fails on its own.
- **Not planned.** No manual, live-app, or end-to-end check is planned. Migration and design work are not needed: the store is in memory, and there is no Figma reference.

## Operational Requirements

- **Required status check `test` on `main`.** Where: repository ruleset `main` (id 26033321), which targets `~DEFAULT_BRANCH`, enforcement `active`. Evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returned the rule `required_status_checks` with the context `test` (integration_id 15368, GitHub Actions) and `strict_required_status_checks_policy: false`. Owner: repository admins (`panz3r`). This change adds, removes, and renames no CI check contexts.
- **Pull request rules on `main`.** At least 1 approving review, squash merge only, and `require_extra_approval_for_unattributed_changes: true`; deletion and non-fast-forward are blocked. Where: the same ruleset `main` (id 26033321). Evidence: the same `gh api` read returned the `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`, plus the `deletion` and `non_fast_forward` rules. Bypass: the repository role with id 5 (admin), `always`. Owner: repository admins (`panz3r`).
- **No classic branch protection.** Where: the `main` branch protection. Evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected". Owner: repository admins (`panz3r`).
- **No organization rulesets.** Where: the repository owner. Evidence: `gh api users/panz3r --jq .type` returned `User`, so the repository is user-owned and no organization rulesets apply. Owner: not applicable.
- **The `test` job sleeps first.** It sleeps for `CI_DELAY_SECONDS` before running, so the required check takes at least that long. Where: repository Actions variable `CI_DELAY_SECONDS`. Evidence: `gh api repos/panz3r/fijih-sample/actions/variables` returned `CI_DELAY_SECONDS=120`, which `.github/workflows/ci.yml` reads (`sleep "${{ vars.CI_DELAY_SECONDS || 0 }}"`). Owner: repository admins (`panz3r`).

## File List

- packages/api/src/store.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- measure/baseline.json
- packages/shared/src/index.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- packages/shared/src/index.test.ts
- _plans/fiji-work-items/FIJIH-40.md

## Implementation Record

- Task 1 (shared): hypothesis: a pure `normalizeTags` returning `null` on invalid input satisfies AC 1-3 at the unit level. Checked with `pnpm --filter @sample/shared test` (10 passed), `typecheck` and `lint packages/shared` clean. Empty-after-trim tags return `null` (default for open decision 2).
- Task 2 (api): hypothesis: validating in `BookmarkStore.add` before the duplicate-URL check gives 400 `invalid tag` with nothing stored. The store also rejects non-array or non-string `tags` at runtime (default for open decision 2). Checked with `pnpm --filter @sample/api test` (7 passed), `typecheck` and `lint packages/api` clean.
- Task 3 (web): hypothesis: wrapping the link and a `span.tags` in one `span` keeps them together in the flex `li` and renders no tags element when empty. Tags use `textContent`. `pnpm --filter @sample/web test` (4 passed), `typecheck` and `lint packages/web` clean.
- Task 4 (baseline): `pnpm build` then `pnpm measure` printed `web_bundle_gzip_bytes=892` (baseline was 835); set `measure/baseline.json` to 892, and `pnpm measure` then printed `web_bundle_gzip_delta=0`.
- Task 5 (root checks): `pnpm test`, `pnpm lint`, `pnpm typecheck` passed from the repository root.

## Validation Evidence

- AC-1: passed — shared `normalizeTags` tests (trim, lower-case, dedupe) and api test "trims, lower-cases, and deduplicates tags" (`[" News ", "news", "Tech"]` gives `news`, `tech`, status 201).
- AC-2: passed — api test "defaults tags to []" (tags missing and `[]`).
- AC-3: passed — api test "answers 400 invalid tag and stores nothing" (33 characters, inner whitespace, non-string, blank, non-array; follow-up GET lists none) and "accepts a 32-character tag"; shared boundary tests.
- AC-4: passed — api test checks `GET /bookmarks` returns the created tags.
- AC-5: passed — web tests: `news, tech` in `.tags` directly after the link; no `.tags` element when `tags` is `[]`.
- AC-6: passed — tests in shared (10), api (7), web (4); `pnpm test`, `pnpm lint`, `pnpm typecheck` pass from the root.
- AC-7: passed — `pnpm build` then `pnpm measure`: `web_bundle_gzip_bytes=892`, `web_bundle_gzip_delta=0` with `measure/baseline.json` at 892.

## Quality Gate

## Review Record

## Change Log

- Drafted from FIJIH-40 at revision 2026-10-28T16:43:21.245+0100. The issue was assigned to the current user.
- Approved: plan-approval — approve
- Open Plan questions were not answered beyond "approve"; defaults taken at approval: add form unchanged, malformed tags answer 400 `invalid tag`, first-occurrence order kept, README not changed.
- Implementation complete: all tasks checked off; checkpoint `implementation-approval`. Bundle baseline moved 835 to 892 bytes (+57).
