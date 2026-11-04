---
schema: fiji/work-item/v1
id: FIJIH-88
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-88
  revision: 2026-11-04T15:55:12.410+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
routing:
  class: standard
  source: user
  implementation_tier: standard
quality:
  gate: pending
artifacts:
  branch: FIJIH-88-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-88: Add tags to bookmarks

## Story

As a user who saves many bookmarks,
I want to give each bookmark an optional list of tags and see them next to its title,
so that I can group related bookmarks.

## Product Context

Source: Jira FIJIH-88 (Story, Medium, label `scenario-S1`), revision `2026-11-04T15:55:12.410+0100`. No comments, attachments, links, or Figma references.

From the issue:

- Context: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Decision: "Tags are not filterable yet."
- Out of scope: "Filtering or searching by tag." and "Editing tags of an existing bookmark."

Open product decisions (asked under the Plan result's `risks`; each has a proposed answer the `plan-approval` decision can accept or change):

- **D1 — Empty tag.** A tag that is empty after trimming (`""`, `"   "`). Proposed: reject with 400 `{"error":"invalid tag"}`, like the other invalid tags.
- **D2 — Malformed `tags` value.** `tags` present but not an array (for example `"work"` or `null`), or an element that is not a string. Proposed: 400 `{"error":"invalid tag"}`.
- **D3 — Tags input on the add form.** The issue asks the page to show tags but not to enter them, so without an input tags can be set only through the API. Proposed: out of scope (no form change).
- **D4 — README.** The `packages/shared` row in `README.md` lists the shared functions ("URL validation and normalisation, sorting"). Proposed: add "tag normalisation" to that row.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` field holding an array of strings. Each tag is trimmed and lower-cased, and duplicates (compared after normalisation) are removed, keeping the first occurrence's position. The 201 response body includes the normalised `tags`. Without `tags`, the bookmark gets `tags: []`.
2. When any tag, after trimming, is longer than 32 characters or contains whitespace, `POST /bookmarks` answers 400 with body `{"error":"invalid tag"}` and stores no bookmark. A tag of exactly 32 characters is accepted.
3. `GET /bookmarks` returns each bookmark with its `tags` array (`[]` when it has none).
4. The web page shows each bookmark's tags after its title, joined with `", "` (for example `work, reading`), and renders no tag element or text when the bookmark has no tags.
5. Vitest unit tests in `packages/shared`, `packages/api`, and `packages/web` cover the behaviour in AC 1–4, and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
6. Handling of an empty tag (D1) and of a malformed `tags` value (D2) follows the `plan-approval` decision, and is covered by tests in `packages/shared` and `packages/api`.

## Tasks and Subtasks

- [ ] Shared: tag model and normalisation (AC: 1, 2, 5, 6)
  - [ ] Add `tags: string[]` to `Bookmark` and optional `tags?: string[]` to `NewBookmark` in `packages/shared/src/index.ts`.
  - [ ] Add a pure function that normalises a tags input: trim, validate (length ≤ 32, no whitespace, plus D1/D2 as decided), lower-case, de-duplicate keeping first occurrence; report an invalid tag so the API can answer `invalid tag`.
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: trimming, lower-casing, de-duplication across case and padding (`[" Work", "work "]` → `["work"]`), order kept, `undefined` → `[]`, 32 characters accepted, 33 rejected, inner whitespace rejected, D1 and D2 cases.
- [ ] API: accept, store, and return tags (AC: 1, 2, 3, 5, 6)
  - [ ] In `packages/api/src/store.ts`, normalise `input.tags` with the shared function in `BookmarkStore.add`, throw `ValidationError("invalid tag")` for an invalid tag before storing, and store `tags` on the bookmark.
  - [ ] In `packages/api/src/app.ts`, pass `body.tags` through to `store.add` (widen the body type; validation stays in the store/shared function).
  - [ ] Tests in `packages/api/src/app.test.ts` and/or `store.test.ts`: POST with tags returns normalised tags; POST without tags returns `tags: []`; GET lists tags; an over-long tag and a tag with inner whitespace answer 400 `{"error":"invalid tag"}` and the list is unchanged; D1 and D2 cases.
- [ ] Web: show tags after the title (AC: 4, 5)
  - [ ] In `packages/web/src/render.ts`, after the title link, render an element (for example `<span class="tags">`) whose text is the tags joined with `", "`, only when the bookmark has at least one tag.
  - [ ] Keep the tags next to the title under the existing `li { display: flex; justify-content: space-between }` rule in `packages/web/index.html` (for example by grouping the link and the tags element, with a small gap before the tags).
  - [ ] Tests in `packages/web/src/render.test.ts`: a bookmark with tags renders `work, reading` after the link; a bookmark with `tags: []` renders no tags element and the item text is unchanged; update existing fixtures for the new required `tags` field.
- [ ] Bundle size baseline (AC: 5)
  - [ ] Run `pnpm build` then `pnpm measure`; the web change moves the gzipped bundle, so set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in the same change (AGENTS.md).
- [ ] README (D4, only if the `plan-approval` decision accepts it) (AC: 5)
  - [ ] Add tag normalisation to the `packages/shared` row in `README.md`.
- [ ] Run the root checks `pnpm test`, `pnpm lint`, `pnpm typecheck` and record the output in Validation Evidence (AC: 5)

## Engineering Context

- Layout: pnpm workspace; `packages/shared` (types and pure functions, imported from source by the others via `@sample/shared`), `packages/api` (Node `http` server in `src/app.ts`, in-memory `BookmarkStore` in `src/store.ts`), `packages/web` (Vite page; `src/render.ts` builds the list, `src/main.ts` fetches and posts).
- Validation pattern: `BookmarkStore.add` throws `ValidationError(message)`; `createApp` maps it to 400 `{ error: message }`. Using `ValidationError("invalid tag")` gives the required body with no change to the error mapping. A non-JSON body already answers 400 `invalid json`.
- Order of checks in `add`: title, URL format, then tags, then the duplicate-URL check (engineering choice; the issue sets no precedence between errors).
- Normalisation order: trim → validate → lower-case → de-duplicate. "Contains whitespace" is tested after trimming with `/\s/`, so leading and trailing spaces are trimmed, never rejected. Length is counted in characters (code points, `[...tag].length`) after trimming and before lower-casing, so a tag is rejected only when longer than 32. Lower-casing uses `toLowerCase()` (locale-independent).
- No limit on the number of tags: the issue sets none.
- `Bookmark.tags` is required (`string[]`), so every stored and returned bookmark carries it; the web test fixtures must add `tags`.
- `src/main.ts` needs no change for display: `renderList` receives the API objects with `tags`. With D3 out of scope, the POST body from the form stays `{ title, url }`.
- Bundle: `scripts/measure` compares the gzipped `packages/web/dist/assets/*.js` to `measure/baseline.json` (835 bytes on `main`); it never fails, and the CI `measure` job only reports.
- Out of scope per the issue: filtering or searching by tag, and editing tags of an existing bookmark. `DELETE /bookmarks/:id` and `GET /health` are unaffected.
- Change intent: the pull request changes packages, so Delivery adds a changeset in `.changeset/` with summary `Add tags to bookmarks` (AGENTS.md).

## Testing Strategy

- Unit (Vitest), one per package, per AGENTS.md:
  - `packages/shared`: happy path (trim, lower-case, de-duplicate, order, default `[]`), boundaries (32 vs 33 characters), unhappy (inner whitespace, D1, D2).
  - `packages/api`: HTTP-level tests through `createApp` on an ephemeral port (existing pattern in `app.test.ts`): POST with and without tags, GET returns tags, 400 `{"error":"invalid tag"}` with no bookmark stored, D1 and D2.
  - `packages/web`: jsdom tests of `renderList` with and without tags.
- Per-package commands: `pnpm --filter @sample/<pkg> test`, `pnpm lint packages/<pkg>`, `pnpm --filter @sample/<pkg> typecheck`; then the root `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Bundle: `pnpm build` then `pnpm measure`; baseline updated in the same change.
- No live-app or end-to-end check: the issue asks for unit tests in the three packages, and the project has no end-to-end suite.
- CI: the `ci` workflow (`test`, `lint`, `typecheck`, `measure`) runs on the pull request; no criterion is CI-only.

## Operational Requirements

- Merging into `main` requires the `test` status check (from the `test` job of `.github/workflows/ci.yml`, which runs on `pull_request`) — where: repository ruleset `main` (id 26033321, enforcement active); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with `[{"context":"test","integration_id":15368}]`; owner: repository admin (`panz3r`).
- Merging into `main` requires one approving review and allows only squash merges — where: repository ruleset `main` (id 26033321); evidence: same call returned a `pull_request` rule with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; owner: repository admin (`panz3r`). Per TEAMS.md the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — where: GitHub branch protection; evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected"; owner: repository admin (`panz3r`).
- The change adds, removes, or renames no CI check context, and needs no environment, secret, deploy configuration, or other repository.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-11-04 — Plan: drafted from FIJIH-88 revision `2026-11-04T15:55:12.410+0100`; issue assigned to Mattia Panzeri. Open decisions D1–D4 await `plan-approval`.
- 2026-11-04 — Approved: plan-approval — Approve with the proposed answers: D1 400 {"error":"invalid tag"}; D2 400 {"error":"invalid tag"}; D3 out of scope; D4 yes, update the README row. Nothing to defer or grant. class standard. Publish: when Local QA passes cleanly, push this branch to origin, create or update its draft pull request, and request Copilot review without stopping at local-qa-review.
- 2026-11-04 — Routed: implementation — standard (score 6; source user; binding inherit)
