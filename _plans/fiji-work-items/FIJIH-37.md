---
schema: fiji/work-item/v1
id: FIJIH-37
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-37
  revision: 2026-10-28T15:25:14.259+0100
lifecycle:
  status: draft
  phase: plan
  checkpoint: plan-approval
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-37-add-bookmark-tags
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-37: Add tags to bookmarks

## Story

As a bookmarks user,
I want to attach an optional list of tags to a bookmark and see them next to its title,
so that I can group related bookmarks.

## Product Context

- Source: Jira story FIJIH-37 "Add tags to bookmarks" (project FIJIH, priority Medium, label `scenario-S21`). No comments, attachments, or Figma links.
- Issue context, quoted: "Users want to group bookmarks. A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria, quoted:
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with {"error":"invalid tag"}.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions (issue): Tags are not filterable yet.
- Out of scope (issue): filtering or searching by tag; editing tags of an existing bookmark.
- Derived reading: because each tag is trimmed, the length and whitespace checks apply to the trimmed tag (otherwise `" a"` would be rejected for whitespace that trimming removes). "Containing whitespace" therefore means whitespace inside the trimmed tag, such as `"two words"`.
- Open product questions (also under the Plan result's risks; the acceptance criteria below use the proposed answer in brackets and change if the user answers otherwise):
  - Q1. A tag that is empty after trimming (`""`, `"   "`): reject with 400 `{"error":"invalid tag"}`, or drop it silently? [proposed: reject]
  - Q2. `tags` present but not an array, or an element that is not a string: 400 `{"error":"invalid tag"}`? [proposed: yes, same error]
  - Q3. The 32-character limit counts Unicode code points of the trimmed, lower-cased tag (so one emoji counts as 1)? [proposed: yes]
  - Q4. Deduplication keeps the first occurrence of each tag, in the order given? [proposed: yes]
  - Q5. The page renders tags as `", "`-separated text (`news, tech`) in its own element after the title link? [proposed: yes]
  - Q6. Adjacent, not named by the issue: should the web "Add" form gain a tags input so users can tag a bookmark from the page? The issue says only that the page shows tags. [proposed: out of scope; the API accepts tags, the page only displays them]
  - Q7. Adjacent, not named by the issue: update the README layout row for `packages/shared` to mention tag normalisation? [proposed: yes, one-line doc change]

## Acceptance Criteria

1. `POST /bookmarks` with a `tags` array of strings answers 201 and the created bookmark's `tags` holds each tag trimmed and lower-cased, with duplicates (after normalisation) removed, keeping first-occurrence order. Example: `["  News ", "tech", "NEWS"]` → `["news", "tech"]`.
2. `POST /bookmarks` without a `tags` field answers 201 with `tags: []`; an explicit `tags: []` gives the same result.
3. `POST /bookmarks` answers 400 with body exactly `{"error":"invalid tag"}`, and stores nothing, when any tag, after trimming and lower-casing, is longer than 32 Unicode code points, contains a whitespace character, or is empty; or when `tags` is present but not an array, or holds a non-string element. A tag of exactly 32 code points is accepted.
4. `GET /bookmarks` returns a `tags` array of strings for every bookmark, equal to the tags stored when it was created.
5. The web page shows, for each bookmark with at least one tag, its tags after the title, joined with `", "` (for example `news, tech`); for a bookmark with no tags it renders no tag element and no extra text.
6. Vitest unit tests cover the new behaviour in `packages/shared` (tag normalisation and validation), `packages/api` (AC 1-4 over HTTP), and `packages/web` (AC 5), and `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root.
7. `measure/baseline.json` holds the `web_bundle_gzip_bytes` value that `pnpm build && pnpm measure` reports on this branch, per the AGENTS.md bundle-size rule.

## Tasks and Subtasks

- [ ] Add tags to the shared model (AC: 1, 2, 3, 4, 6)
  - [ ] Add `tags: string[]` to `Bookmark`, and an optional `tags?: readonly string[]` to `NewBookmark` in `packages/shared/src/index.ts`.
  - [ ] Add a pure `normalizeTags(input: unknown): string[]` that trims, lower-cases, validates (AC 3 rules), and deduplicates in first-occurrence order, throwing a dedicated error (or returning a result the API maps) for invalid input; export `MAX_TAG_LENGTH = 32`.
  - [ ] Unit tests in `packages/shared/src/index.test.ts`: normalisation and dedup example, default for `undefined`, the 32/33 code-point boundary, inner whitespace, empty-after-trim, non-array and non-string input.
- [ ] Accept and return tags in the API (AC: 1, 2, 3, 4, 6)
  - [ ] `packages/api/src/store.ts`: `add` normalises `input.tags` through `normalizeTags`, raising `ValidationError("invalid tag")` on invalid input before any other side effect, and stores `tags` on the bookmark.
  - [ ] `packages/api/src/app.ts`: pass `body.tags` through to `store.add` unchanged (validation stays in the store/shared function).
  - [ ] Tests in `packages/api/src/app.test.ts`: POST with tags (AC 1), without tags and with `[]` (AC 2), each invalid case answers 400 `{"error":"invalid tag"}` and the list is unchanged (AC 3), GET returns tags (AC 4). Update the existing assertions that compare whole bookmarks, if any, for the new field.
- [ ] Show tags on the page (AC: 5, 6)
  - [ ] `packages/web/src/render.ts`: after the title link, append an element (for example a `<span class="tags">`) with `bookmark.tags.join(", ")` only when `tags.length > 0`; set it with `textContent`, never HTML.
  - [ ] Tests in `packages/web/src/render.test.ts`: tags shown comma separated after the title; no tag element when `tags` is empty; existing fixtures gain `tags`.
- [ ] Run the root checks (AC: 6)
  - [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` from the repository root.
- [ ] Update the bundle-size baseline (AC: 7)
  - [ ] `pnpm build && pnpm measure`; write the reported `web_bundle_gzip_bytes` into `measure/baseline.json` in this change.
- [ ] (Only if Q7 is answered yes) Update the `packages/shared` row in `README.md` to mention tag normalisation (AC: 6)

## Engineering Context

- Workspace: pnpm; `@sample/shared` is consumed from source (`exports: ./src/index.ts`) by `@sample/api` and `@sample/web`, so a type change in `Bookmark` reaches both packages and their type-checks.
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark`, and pure helpers (`isValidBookmarkUrl`, `normalizeUrl`, `sortByCreatedDesc`). Tag normalisation belongs here, as a pure function, alongside URL normalisation.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates and throws `ValidationError(message)`; `app.ts` maps `ValidationError` to `400 {"error": message}`, so `ValidationError("invalid tag")` yields the required body with no change to the error mapping. `SyntaxError` maps to `invalid json`; `normalizeTags` must not throw `SyntaxError`.
  - `packages/api/src/app.ts` — POST currently picks only `url` and `title` from the body; it must forward `tags`.
  - `packages/web/src/render.ts` — `renderList` builds each `<li>` as `<a>` + Remove `<button>`; the `li` is `display:flex; justify-content: space-between` in `index.html`, so a tags element placed between the link and the button sits next to the title. Keep the link text equal to the title so existing tests and accessibility stay intact.
  - `packages/web/src/main.ts` — fetches `/bookmarks` as `Bookmark[]`; no change needed for display. The form posts only `title` and `url` (see Q6).
- Validation order in `add`: tags are validated with the other input checks, before the duplicate-URL check and before insertion, so a 400 stores nothing. When several fields are invalid, the existing checks (title, url) keep running first; tag errors surface only when title and url are valid. This keeps current error messages unchanged.
- Code points: count with `[...tag].length`, not `tag.length`. Whitespace test: `/\s/u` on the trimmed tag.
- Storage is in-memory (`Map`); there is no persisted data and no migration.
- Bundle size: the web change adds a few bytes to the gzipped bundle (baseline 835 bytes); AGENTS.md requires updating `measure/baseline.json` in the same pull request.
- Changeset: the pull request changes packages, so delivery adds a `.changeset/` entry (summary "Add tags to bookmarks"); that belongs to the Delivery phase, not Implementation.
- Commits: Conventional Commits, one logical change each, for example `feat: normalise bookmark tags in shared`, `feat: accept and return tags in the api`, `feat: show bookmark tags on the page`, `chore: update web bundle baseline`.

## Testing Strategy

- Unit (Vitest, `packages/shared`): happy path (trim, lower-case, dedup, order), default `[]` for missing input, boundary 32 vs 33 code points (including a multi-code-unit character), unhappy paths (inner whitespace, empty after trim, non-array, non-string element).
- Integration (Vitest over a real `http` server, `packages/api`): POST with tags, without tags, with `[]`; each 400 case asserts status, exact body `{"error":"invalid tag"}`, and that `GET /bookmarks` is unchanged afterwards; GET returns `tags` on every bookmark.
- DOM (Vitest + jsdom, `packages/web`): tags rendered as `news, tech` after the title link; no tag element for `tags: []`; Remove still wired.
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck` (CI `test`, `lint`, `typecheck` jobs run the same on the pull request).
- Bundle size: `pnpm build && pnpm measure` locally, baseline updated (AC 7). The CI `measure` job reports the delta but never fails, so no criterion depends on CI alone.
- No migration, design, or release work: storage is in-memory, no Figma reference, no deploy configuration in this repository.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) on `main`, plus one approving review and squash-only merges — where: repository ruleset `main` (id 26033321, enforcement active) on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` returned `required_status_checks` with context `test`, `pull_request` with `required_approving_review_count: 1` and `allowed_merge_methods: ["squash"]`; `gh api repos/panz3r/fijih-sample/branches/main/protection` returned 404 "Branch not protected" (no classic protection); owner: repository admin (`panz3r`). This change adds, removes, or renames no check contexts.
- The required `test` job first sleeps for `vars.CI_DELAY_SECONDS` seconds — where: repository Actions variable `CI_DELAY_SECONDS` on panz3r/fijih-sample; evidence: `gh api repos/panz3r/fijih-sample/actions/variables` returned `CI_DELAY_SECONDS = "240"`, so the required check stays pending for at least 4 minutes on each push; owner: repository admin (`panz3r`).
- Approval from the team's QA Engineer (`duckyduff369`, per TEAMS.md) — where: GitHub pull request review; evidence: ruleset requires 1 approval (above); TEAMS.md and CODEOWNERS (`* @panz3r @duckyduff369`) name the reviewers; owner: QA Engineer `duckyduff369`.

## File List

## Implementation Record

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-28: Plan drafted from Jira FIJIH-37 (revision 2026-10-28T15:25:14.259+0100); issue assigned to Mattia Panzeri.
