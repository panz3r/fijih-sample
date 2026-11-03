---
schema: fiji/work-item/v1
id: FIJIH-79
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-79
  revision: "2026-11-03T14:32:45.535+0100"
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-79-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-79: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags and see them in the list,
so that I can group related bookmarks.

## Product Context

- Source: Jira FIJIH-79 "Add tags to bookmarks" (Story, Medium, label `scenario-S1`), revision `2026-11-03T14:32:45.535+0100`. No comments, no links, no attachments, no Figma reference.
- Issue context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions (from the issue): tags are not filterable yet.
- Out of scope (from the issue): filtering or searching by tag; editing tags of an existing bookmark.
- Reading of the issue used by this plan: trimming happens first, so the 32-character limit and the whitespace rule apply to the trimmed tag (a tag with only leading or trailing spaces is valid; `"a b"` is not). Lower-casing and deduplication follow, keeping the first occurrence's position.

### Open product decisions (asked under `risks`; answered at `plan-approval`)

- D1 — Malformed `tags` input the issue does not cover: a `tags` value that is not an array (for example `"news"` or `null`), an element that is not a string, or a tag that is empty after trimming (`""`, `"   "`). Proposed: each answers 400 `{"error":"invalid tag"}` and stores nothing. AC 2b states the proposal and changes to match the answer.
- D2 — Add form: the page's add form (`packages/web/index.html`, `packages/web/src/main.ts`) has no tags input today, so tags can only be created through the API. The issue names display only. Is a tags input on the add form in scope? This plan assumes not until answered.
- D3 — README: the `packages/shared` row in `README.md` lists "URL validation and normalisation, sorting". Should it also mention tag normalisation? This plan assumes no README change until answered.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence's position. The 201 response body includes `tags`; when `tags` is omitted it is `[]`. Example: `["  News ", "news", "Tech"]` is stored and returned as `["news", "tech"]`.
2. a. When any tag, after trimming, is longer than 32 characters or contains whitespace, `POST /bookmarks` answers 400 with exactly `{"error":"invalid tag"}` and no bookmark is stored (a following `GET /bookmarks` does not include it). A 32-character tag is accepted; a 33-character tag is rejected.
   b. (Pending D1) A non-array `tags` value, a non-string element, or a tag that is empty after trimming answers 400 `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns `tags` (an array, `[]` when none) on every bookmark, with the values stored at creation.
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`), and renders no tag element or text for a bookmark with no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover AC 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. The change follows the repository's delivery conventions in `AGENTS.md`: a changeset in `.changeset/` whose summary is `Add tags to bookmarks`, and `measure/baseline.json` updated to the new `web_bundle_gzip_bytes` printed by `pnpm build` then `pnpm measure` when the bundle size moves.

## Tasks and Subtasks

- [ ] T1 — Shared tag model and normalisation in `packages/shared` (AC: 1, 2, 3, 5)
  - [ ] Add `tags: string[]` to `Bookmark`; make `NewBookmark` accept an optional `tags`.
  - [ ] Add pure, exported tag functions (for example `isValidTag(tag)` and `normalizeTags(value)`) that trim, check length (≤ 32) and whitespace, lower-case, and deduplicate in first-occurrence order, and report invalid input (including the D1 cases as decided) without throwing a package-specific error.
  - [ ] Vitest tests in `packages/shared/src/index.test.ts`: trim, lower-case, dedupe order, default `[]`, 32 vs 33 characters, inner whitespace, and the D1 cases.
- [ ] T2 — API accepts, validates, stores, and returns tags in `packages/api` (AC: 1, 2, 3, 5)
  - [ ] `app.ts`: forward `body.tags` from the POST body to the store.
  - [ ] `store.ts`: normalise tags with the shared functions, throw `ValidationError("invalid tag")` for invalid input before storing, and store `tags` (default `[]`) on the bookmark.
  - [ ] Vitest tests in `packages/api/src/app.test.ts` (and `store.test.ts` where simpler): normalised tags in the 201 body and in `GET /bookmarks`; omitted `tags` gives `[]`; a 33-character tag and a tag with inner whitespace answer 400 `{"error":"invalid tag"}` and are not listed afterwards; the D1 cases as decided.
- [ ] T3 — Web page shows tags after the title in `packages/web` (AC: 4, 5)
  - [ ] `render.ts`: after the link, append an element holding `bookmark.tags.join(", ")` only when the bookmark has tags.
  - [ ] Vitest tests in `packages/web/src/render.test.ts`: tags shown after the title, comma separated; no tag element or text when `tags` is `[]`. Update existing fixtures to include `tags`.
- [ ] T4 — Bundle-size baseline (AC: 6)
  - [ ] Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is not 0, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in this change, and record both values under Validation Evidence.
- [ ] T5 — Changeset (AC: 6)
  - [ ] Add `.changeset/<name>.md` with summary `Add tags to bookmarks` covering `@sample/shared`, `@sample/api`, and `@sample/web` (`minor`).
- [ ] T6 — Repository checks (AC: 5)
  - [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results under Validation Evidence.

## Engineering Context

- Workspace: pnpm; `packages/shared` is imported by `packages/api` and `packages/web` from source (`exports: "./src/index.ts"`), so a `Bookmark` type change reaches both without a build step.
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. Pure functions only; tag rules live here.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates (`ValidationError` messages become the 400 `error` text in `app.ts`) and builds the stored `Bookmark`. Validation runs before `items.set`, so a rejected tag stores nothing.
  - `packages/api/src/app.ts` — `POST /bookmarks` casts the JSON body and passes `url` and `title`; `tags` must be passed through as received (type `unknown` until validated) so malformed values reach validation. `ValidationError` → 400 `{ error: message }` already exists.
  - `packages/web/src/render.ts` — `renderList` builds `<li><a>title</a><button>Remove</button></li>`; the tags element goes between the link and the button. `index.html` styles `li` as `display: flex; justify-content: space-between`; keep the change minimal and use `textContent` (no HTML injection).
  - `packages/web/src/main.ts` — unchanged unless D2 adds a tags input.
- Conventions (`AGENTS.md`): branch `FIJIH-79-add-tags-to-bookmarks`; Conventional Commits, one logical change per commit (for example `feat: add tag normalisation to shared`, `feat: accept and return bookmark tags in the api`, `feat: show bookmark tags on the web page`, `chore: update web bundle baseline`, `chore: add changeset for bookmark tags`); every behaviour change has a Vitest test in the package it changes; PR title `[FIJIH-79] Add tags to bookmarks`, label `enhancement` (issue type Story); reviewer from the Bookmarks team in `TEAMS.md` (QA Engineer `duckyduff369`).
- Tag length is measured on the trimmed tag in characters (Unicode code points, `[...tag].length`); whitespace means any `\s` character.
- `Bookmark.tags` becomes a required field, so typed fixtures in `packages/web/src/render.test.ts` need `tags`.
- Ordering of `GET /bookmarks` (newest first, same-millisecond ties newest first) must not change.

## Testing Strategy

- Unit (Vitest, per package, per `AGENTS.md`):
  - `packages/shared`: happy path (trim, lower-case, dedupe with first-occurrence order, default `[]`); boundaries (32 accepted, 33 rejected); unhappy (inner whitespace; D1 cases as decided).
  - `packages/api`: HTTP integration through `createApp` on an ephemeral port, as the existing `app.test.ts` does: 201 body with normalised tags; `GET /bookmarks` returns tags for each bookmark and `[]` when omitted; 400 `{"error":"invalid tag"}` for an invalid tag with nothing stored; D1 cases as decided; existing ordering and validation tests still pass.
  - `packages/web` (jsdom): tags rendered after the title as `a, b`; nothing rendered for `[]`; Remove still wired.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root (T6); CI runs the same on the pull request, and `test` is the required check.
- Bundle size: `pnpm build` then `pnpm measure` (T4).
- No migration (in-memory store), no design source, no manual or end-to-end checks: the issue asks for unit tests only.

## Operational Requirements

- Required status check `test` (GitHub Actions, the `test` job of `.github/workflows/ci.yml`, which runs on `pull_request`) must pass before merge — where: repository ruleset `main` (id 26033321) on the default branch; evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` returned `required_status_checks: [{context: "test", integration_id: 15368}]`, `enforcement: active`; owner: repository admins (panz3r). This change adds, removes, and renames no check contexts.
- One approving review, squash merge only — where: repository ruleset `main` (id 26033321), `pull_request` rule; evidence: same call returned `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`, `require_code_owner_review: false`; owner: repository admins (panz3r). Per `AGENTS.md` and `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — where: branch protection API; evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected"; `gh api repos/panz3r/fijih-sample/rules/branches/main` lists only ruleset 26033321's rules; owner: repository admins (panz3r).
- No environments, secrets, deploy configuration, other repositories, or writes to systems outside the repository are needed.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-03 — Plan drafted from FIJIH-79 revision `2026-11-03T14:32:45.535+0100`; issue assigned to the current user.
