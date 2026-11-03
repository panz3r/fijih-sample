---
schema: fiji/work-item/v1
id: FIJIH-76
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-76
  revision: 2026-11-03T12:22:07.636+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-76-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-76: Add tags to bookmarks

## Story

As a bookmarks user,
I want to give each bookmark an optional list of tags that the API stores and the page shows,
so that I can group my bookmarks.

## Product Context

- Source: Jira FIJIH-76 "Add tags to bookmarks" (Story, label `scenario-S1`, no comments, no links, no attachments, no Figma reference).
- Context from the issue: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision from the issue: "Tags are not filterable yet."
- Out of scope from the issue: "Filtering or searching by tag." and "Editing tags of an existing bookmark."
- Open product decisions (see Engineering Context > Open decisions): whether the web add form gets a tags input, how trimming interacts with the length/whitespace rules, empty tags, and malformed `tags` values.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, and duplicates (after trimming and lower-casing) are removed, keeping the first occurrence's position. When `tags` is omitted the bookmark gets `tags: []`. The `201` response body includes the normalised `tags`. Example: `["News", " news ", "Tech"]` is stored and returned as `["news", "tech"]`.
2. When any tag is longer than 32 characters or contains whitespace, `POST /bookmarks` answers `400` with body `{"error":"invalid tag"}` and stores nothing.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` for a bookmark created without tags).
4. The web page shows each bookmark's tags after its title, joined by `", "` (for example `news, tech`), and renders no tag text or tag element for a bookmark with no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the new behaviour of criteria 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.

## Tasks and Subtasks

- [x] 1. `packages/shared`: extend the model and add pure tag helpers (AC: 1, 2, 5)
  - [x] 1.1 Add `tags: string[]` to `Bookmark`; make `NewBookmark` `Pick<Bookmark, "url" | "title"> & { tags?: readonly string[] }`.
  - [x] 1.2 Add `isValidTag(tag: string): boolean` (after trimming: at most 32 characters and no whitespace character, `/\s/`; empty-tag handling per Open decision D3).
  - [x] 1.3 Add `normalizeTags(tags: readonly string[]): string[]` (trim, lower-case, deduplicate keeping first occurrence order; does not mutate the input).
  - [x] 1.4 Tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, deduplication across case/whitespace variants, order kept, input not mutated; `isValidTag` accepts a 32-character tag and rejects a 33-character tag, an internal space, and an internal tab.
- [x] 2. `packages/api` store: validate, normalise, and store tags (AC: 1, 2, 3, 5)
  - [x] 2.1 In `BookmarkStore.add`, validate every tag with `isValidTag` and throw `ValidationError("invalid tag")` on the first failure, before anything is stored; store `normalizeTags(input.tags ?? [])`.
  - [x] 2.2 Tests in `packages/api/src/store.test.ts`: default `[]`, normalisation, rejection leaves the store unchanged, `list()` returns tags.
- [x] 3. `packages/api` HTTP: accept and return tags (AC: 1, 2, 3, 5)
  - [x] 3.1 In `createApp`, read `tags` from the POST body and pass it to `store.add`; a `tags` value that is neither omitted nor an array of strings is handled per Open decision D4.
  - [x] 3.2 Tests in `packages/api/src/app.test.ts`: POST with tags returns 201 and normalised tags; POST without tags returns `tags: []`; POST with a 33-character tag and with a tag containing a space each return 400 `{"error":"invalid tag"}` and the bookmark is absent from `GET /bookmarks`; `GET /bookmarks` returns each bookmark's tags.
- [x] 4. `packages/web`: show tags after the title (AC: 4, 5)
  - [x] 4.1 In `renderList`, when `bookmark.tags` is non-empty append an element (for example `<span class="tags">`) after the link whose `textContent` is `tags.join(", ")`; append nothing when it is empty. Use `textContent`, never `innerHTML`.
  - [x] 4.2 Update existing fixtures in `packages/web/src/render.test.ts` for the new required `tags` field, and add tests: a bookmark with `["news", "tech"]` shows `news, tech` after the title; a bookmark with `[]` renders no tag element and its item text is the title plus `Remove` only.
- [ ] 5. Run the repository checks from the root: `pnpm test`, `pnpm lint`, `pnpm typecheck` (AC: 5)
- [x] 6. Bundle size: run `pnpm build` then `pnpm measure`; when `web_bundle_gzip_delta` is non-zero, set `measure/baseline.json` `web_bundle_gzip_bytes` to the new value in this change, per `AGENTS.md` (AC: 4)

## Engineering Context

- Workspace: pnpm; `packages/shared` is imported from source by `api` and `web` (`"exports": { ".": "./src/index.ts" }`).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, and pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag helpers belong here as pure functions.
  - `packages/api/src/store.ts` — `BookmarkStore.add` performs all validation and throws `ValidationError(message)`; `app.ts` maps `ValidationError` to `400 {"error": message}`, so `ValidationError("invalid tag")` yields the required body with no change to error mapping.
  - `packages/api/src/app.ts` — POST handler casts the body to `{ url?, title? }` and builds the `NewBookmark`; it must now pass `tags`.
  - `packages/web/src/render.ts` — `renderList` builds `<li>` with `<a>` (title) and a Remove `<button>`; tags go between them. `packages/web/src/main.ts` and `index.html` hold the add form (title, url only).
- Design choices within the criteria:
  - Validation runs on the trimmed tag (Open decision D2); "characters" counts Unicode code points (`[...tag].length`), so non-ASCII tags are not penalised by UTF-16 surrogate pairs.
  - Lower-casing uses `toLowerCase()` (locale-independent).
  - Deduplication keeps the first occurrence's position, so the stored order follows the request order.
  - The in-memory store holds no pre-existing data, so no migration is needed; every stored bookmark gets a `tags` array.
- Open decisions (asked under plan risks; the plan follows the stated proposal unless the plan-approval answer says otherwise):
  - D1 — Web add form: the issue says only that the page shows tags; `index.html`/`main.ts` have no tags input. Proposal: no form input in this item (tags can be added through the API only). README's layout table is likewise left unchanged.
  - D2 — Trim before checks: proposal: the 32-character and whitespace rules apply after trimming, so `" news "` is valid (stored `news`) and `"breaking news"` is rejected.
  - D3 — Empty tag: a tag that is empty after trimming (`""`, `"   "`). Proposal: reject with `400 {"error":"invalid tag"}`.
  - D4 — Malformed `tags`: a `tags` value that is not an array of strings (for example `"news"`, `[1]`, `null`). Proposal: reject with `400 {"error":"invalid tag"}`.
- Delivery notes: a changeset in `.changeset/` with summary "Add tags to bookmarks" is part of Delivery (change intent), per `AGENTS.md`.

## Testing Strategy

- Unit (Vitest, per package, run by `pnpm test` and by the `test` job of the `ci` workflow):
  - `packages/shared`: happy path normalisation (trim, lower-case, dedupe, order), boundary 32 vs 33 characters, whitespace rejection (space, tab), empty tag per D3, input immutability.
  - `packages/api` store: default `[]`, normalised storage, rejection stores nothing, `list()` includes tags.
  - `packages/api` HTTP (integration over a real `http` server on an ephemeral port, as in `app.test.ts`): 201 with tags, 201 without tags, 400 `invalid tag` for too long, whitespace, and malformed `tags` (D4), GET returns tags.
  - `packages/web` (jsdom): tags rendered after the title joined by `", "`; nothing rendered for no tags; existing empty-state and Remove tests still pass.
- Unhappy paths: covered by the 400 cases above, including that a rejected POST leaves `GET /bookmarks` unchanged.
- Static checks: `pnpm lint`, `pnpm typecheck` (the new required `Bookmark.tags` field makes the type-checker flag every construction site).
- No manual, live-app, or end-to-end check is required by the issue; none is planned.
- Release: bundle size measured locally (Task 6); the CI `measure` job reports the same value on the pull request and never fails on its own.

## Operational Requirements

- Merging into `main` requires the status check `test` (GitHub Actions) — where: repository ruleset `main` (id 26033321, target `~DEFAULT_BRANCH`, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → `required_status_checks: [{context: "test", integration_id: 15368}]`; owner: repository admin (`panz3r`). This change adds, removes, and renames no CI check contexts; `.github/workflows/ci.yml` runs job `test` on `pull_request`.
- Merging into `main` requires one approving review and squash merge — where: repository ruleset `main` (id 26033321); evidence: same call → `pull_request.required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per `TEAMS.md`, the approval comes from the QA Engineer `duckyduff369`.
- No other external configuration (environments, secrets, deploy configuration, other repositories) is involved: the change is confined to the three workspace packages and `measure/baseline.json`.

## File List

- packages/shared/src/index.ts
- packages/shared/src/index.test.ts
- packages/api/src/store.ts
- packages/api/src/store.test.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts
- packages/web/src/render.ts
- packages/web/src/render.test.ts
- measure/baseline.json

## Implementation Record

Task 1 — shared: added `tags` to `Bookmark`, optional `tags` on `NewBookmark`, pure `isValidTag` (trim, non-empty, <=32 code points, no whitespace) and `normalizeTags`; tests added. `pnpm --filter @sample/shared test`: 12 passed.
Task 2 — api store: `BookmarkStore.add` validates every tag (after title/url checks, before the duplicate check and any write) and stores `normalizeTags(tags)`; store tests added (default, normalisation, 4 rejection cases leave store empty).
Task 3 — api HTTP: POST passes `tags` through; a non-array or non-string-element `tags` (D4, including null) throws `ValidationError("invalid tag")` -> 400; integration tests added. `pnpm --filter @sample/api test`: 17 passed.
Task 4 — web: `renderList` appends `<span class="tags">` (textContent, joined by ", ") between the title and Remove only when tags are non-empty; fixtures updated, 2 tests added. `pnpm --filter @sample/web test`: 4 passed.
Task 6 — `pnpm build` then `pnpm measure`: web_bundle_gzip_bytes=881, web_bundle_gzip_delta=46; set `measure/baseline.json` `web_bundle_gzip_bytes` from 835 to 881.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-03 — Plan: drafted from FIJIH-76 at source revision 2026-11-03T12:22:07.636+0100; issue assigned to Mattia Panzeri.
- 2026-11-03 — Approved: plan-approval — Approve with the proposed answers: 1. No to both. 2. Yes. 3. 400. 4. Yes. Publish: yes. Notify: no.
