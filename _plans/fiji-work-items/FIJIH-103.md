---
schema: fiji/work-item/v1
id: FIJIH-103
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-103
  revision: 2026-11-05T16:10:06.551+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
routing:
  class: deep
  source: rubric
  implementation_tier: deep
quality:
  gate: pending
artifacts:
  branch: FIJIH-103-add-tags-to-bookmarks
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-103: Add tags to bookmarks

## Story

As a user who keeps many bookmarks,
I want to give each bookmark an optional list of tags that the API stores and the page shows,
so that I can group related bookmarks.

## Product Context

- Source: Jira story FIJIH-103 "Add tags to bookmarks" (Story, priority Medium, label `scenario-S1`), no comments, no links, no attachments, no Figma URL.
- Issue context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria (verbatim):
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Issue decisions: "Tags are not filterable yet."
- Issue out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

## Acceptance Criteria

1. `POST /bookmarks` without a `tags` field answers 201 with the created bookmark, whose `tags` is `[]`.
2. `POST /bookmarks` with `tags` as an array of strings stores and returns each tag trimmed and lower-cased, with duplicates (compared after trimming and lower-casing) removed and first occurrences kept in input order; for example `[" News ", "news", "Tech"]` is stored as `["news", "tech"]`. An empty array stores `[]`.
3. `POST /bookmarks` answers 400 with `{"error":"invalid tag"}` and stores nothing when any tag, after trimming and lower-casing, is longer than 32 characters (Unicode code points) or contains whitespace; a tag of exactly 32 characters is accepted.
4. `POST /bookmarks` answers 400 with `{"error":"invalid tag"}` and stores nothing when `tags` is present but is not an array of strings (for example a string, `null`, or an array holding a number), or when a tag is empty after trimming (Open questions 2 and 3, at their defaults).
5. `GET /bookmarks` returns every bookmark with its `tags` array, as stored by criteria 1 and 2.
6. The web page shows each bookmark's tags after its title as one text, joined by `", "` (for example `news, tech`); a bookmark with no tags shows no tag text and no tags element.
7. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–6, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
8. `measure/baseline.json` records the `web_bundle_gzip_bytes` that `pnpm build` then `pnpm measure` prints on this branch, so `pnpm measure` prints `web_bundle_gzip_delta=0`.

## Tasks and Subtasks

- [x] 1. Shared tag model and normalization in `packages/shared/src/index.ts` (AC: 1, 2, 3, 4, 7)
  - [x] 1.1 Add `tags: string[]` to `Bookmark`, and an optional `tags` input to `NewBookmark` (typed so the store can pass an unvalidated request value through).
  - [x] 1.2 Add a pure `normalizeTags(value: unknown): string[] | null`: `undefined` gives `[]`; a non-array or a non-string element gives `null`; otherwise trim and lower-case (`toLowerCase()`) each tag, give `null` when any result is empty, longer than 32 code points, or contains whitespace (`/\s/`), and drop later duplicates keeping input order.
  - [x] 1.3 Add Vitest cases in `packages/shared/src/index.test.ts`: default `[]`, trim plus lower-case plus dedupe order, exactly 32 accepted, 33 rejected, inner whitespace rejected, empty after trim rejected, non-array and non-string element rejected, input not mutated.
- [x] 2. Store validation in `packages/api/src/store.ts` (AC: 1, 2, 3, 4, 5, 7)
  - [x] 2.1 In `BookmarkStore.add`, call `normalizeTags(input.tags)`; on `null` throw `ValidationError("invalid tag")` before anything is stored; save the normalized list on the bookmark.
  - [x] 2.2 Add Vitest cases in `packages/api/src/store.test.ts`: default `[]`, normalized tags listed by `list()`, and an invalid tag throws `ValidationError` with message `invalid tag` and leaves the store unchanged.
- [ ] 3. HTTP surface in `packages/api/src/app.ts` (AC: 1, 2, 3, 4, 5, 7)
  - [ ] 3.1 Pass `body.tags` from the `POST /bookmarks` body to `store.add` unchanged; the existing `ValidationError` handler already answers 400 with the message.
  - [ ] 3.2 Add Vitest cases in `packages/api/src/app.test.ts`: POST without tags answers 201 with `tags: []`; POST with mixed-case, padded, duplicate tags answers 201 with the normalized list and `GET /bookmarks` returns it; a 33-character tag, a tag with inner whitespace, an empty tag, and a non-array `tags` each answer 400 `{"error":"invalid tag"}` and the next `GET /bookmarks` does not contain the rejected bookmark. Use URLs distinct from the existing tests, since the suite shares one server and the duplicate-URL check applies.
- [ ] 4. Tags on the page in `packages/web/src/render.ts` and `packages/web/index.html` (AC: 6, 7)
  - [ ] 4.1 In `renderList`, after the title link, append a `<span class="tags">` whose text is `bookmark.tags.join(", ")` only when the bookmark has at least one tag; keep the link and the tags together so the existing flex layout keeps Remove at the end of the row.
  - [ ] 4.2 Add a `.tags` rule in `packages/web/index.html` that separates the tags from the title (for example a left margin and a muted colour).
  - [ ] 4.3 Update the bookmark fixtures in `packages/web/src/render.test.ts` with `tags`, and add Vitest cases: tags render after the title joined by `", "`, and no `.tags` element exists when `tags` is `[]`.
- [ ] 5. Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` from the repository root and record the results in Validation Evidence (AC: 7)
- [ ] 6. Run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is not 0, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed `web_bundle_gzip_bytes` in the same change and rerun `pnpm measure` to show delta 0 (AC: 8)

## Engineering Context

### Controlling code

- `packages/shared/src/index.ts`: `Bookmark`, `NewBookmark` (`Pick<Bookmark, "url" | "title">`), and the pure helpers `isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`. The other packages import it from source (`"exports": { ".": "./src/index.ts" }`).
- `packages/api/src/store.ts`: in-memory `BookmarkStore` (a `Map`); `add` validates title, URL, and duplicate URL and throws `ValidationError`; nothing is persisted, so no data migration is needed.
- `packages/api/src/app.ts`: Node `http` server; `POST /bookmarks` casts the JSON body and calls `store.add`; any `ValidationError` answers 400 `{"error": <message>}`.
- `packages/web/src/render.ts`: `renderList` builds one `<li>` per bookmark with an `<a>` title link and a Remove `<button>`; `packages/web/index.html` styles `li` as `display: flex; justify-content: space-between`.
- `packages/web/src/main.ts`: fetches `GET /bookmarks` and posts the add form (`title`, `url` only); it needs no change for this item (Open question 1).

### Conventions

- Validation messages follow the existing lower-case style (`"title is required"`), so the new message is exactly `invalid tag`.
- Pure logic belongs in `packages/shared`; the store maps a failed check to `ValidationError`, as it does for URLs.
- Every behaviour change ships with a Vitest test in the package it changes (`AGENTS.md`). The web tests run under `jsdom` (`packages/web/vite.config.ts`).
- Commits use Conventional Commits, one logical change each (`AGENTS.md`).

### Design decisions

- Tags are validated after trimming and lower-casing, so `" News "` is valid and `"Breaking News"` is not (inner whitespace). Length counts Unicode code points (`[...tag].length`), not UTF-16 units.
- Validation order in `add`: title, URL, tags, then the duplicate-URL check, so a request with an invalid tag never reaches the duplicate check.
- Tags render as a sibling of the title link, outside the `<a>`, so clicking a tag does not open the bookmark.

### Out of scope

- Filtering or searching by tag, and editing tags of an existing bookmark (Jira FIJIH-103, "Out of scope"; "Decisions: Tags are not filterable yet.").

### Open questions

1. Should the add form on the web page get a tags input? The issue asks the page only to show tags. (default: no; tags are set through `POST /bookmarks` only, and `packages/web/src/main.ts` stays unchanged)
2. What should `POST /bookmarks` answer when `tags` is present but is not an array of strings (a string, `null`, or an array holding a number)? (default: 400 `{"error":"invalid tag"}`, as in AC 4)
3. What should `POST /bookmarks` answer for a tag that is empty after trimming (`""` or `"   "`)? (default: 400 `{"error":"invalid tag"}`, as in AC 4)
4. Is the 32-character limit measured after trimming and lower-casing, in Unicode code points? (default: yes, as in AC 3)

## Testing Strategy

- Happy path (Vitest): `packages/shared` `normalizeTags` default, trimming, lower-casing, and order-keeping dedupe; `packages/api` store and HTTP `POST /bookmarks` with and without tags, then `GET /bookmarks` returning them; `packages/web` `renderList` showing `news, tech` after the title.
- Unhappy path (Vitest): tags of 33 code points, with inner whitespace, empty after trimming, a non-array `tags`, and a non-string element each give `{"error":"invalid tag"}` with status 400 at the HTTP level, `null` from `normalizeTags`, and no stored bookmark; a 32-code-point tag is accepted (boundary).
- Integration (Vitest): `packages/api/src/app.test.ts` exercises the real `http` server through `fetch`, covering the body-to-store path and the 400 mapping end to end.
- Rendering (Vitest, jsdom): no `.tags` element when `tags` is `[]`; tags appear after the `<a>` and outside it.
- Repository checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root (Task 5); `pnpm build` then `pnpm measure` for the bundle baseline (Task 6).
- Release: the pull request changes `packages/shared`, `packages/api`, and `packages/web`, so Delivery adds a changeset in `.changeset/` whose summary is the pull request title without the Jira key (`AGENTS.md`).

## Operational Requirements

None — this change needs no configuration outside the repository added, changed, or newly relied on.

- Required checks: `gh api repos/panz3r/fijih-sample/rulesets/26033321` shows ruleset `main` (target `~DEFAULT_BRANCH`, active) requiring status check `test` (integration 15368), one approving review, squash merges only. This change keeps `.github/workflows/ci.yml` as it is, so it adds, removes, or renames no check context.
- Secrets, environments, and deploy settings: the change touches only `packages/*/src`, `packages/web/index.html`, and `measure/baseline.json`, and uses no secret, environment, variable, or deploy setting; `gh api repos/panz3r/fijih-sample/environments` reports 1 environment, which nothing in this change relies on.
- Other repositories: none are touched.

## File List
- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/store.test.ts

## Implementation Record
Task 1 — add Bookmark.tags and normalizeTags with shared tests (shared test, lint, typecheck pass; 10 tests)
Task 2 — BookmarkStore.add validates and stores normalized tags (api tests pass)

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- Approved: plan-approval — Approve with the proposed defaults for all four questions. Nothing to defer or grant. Grant Publish: when Local QA passes cleanly, push this branch to origin, create or update its draft pull request, and request Copilot review without stopping at local-qa-review. Grant Notify: when Copilot's review needs no change and every required check passes, mark the pull request ready without stopping at ready-for-review. (answering: Planned-check question) (answering: Outside-write question)
- Routed: implementation — deep (score 5; source rubric; binding inherit; signals 6 tasks, 8 criteria, 0 CI-measured, integration_or_migration_work true, no operational requirements, no Figma, 0 open risks, Plan estimate standard, no recorded floor)
Task 1 done
Task 2 done
