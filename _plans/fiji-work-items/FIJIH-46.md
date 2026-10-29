---
schema: fiji/work-item/v1
id: FIJIH-46
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-46
  revision: 2026-10-29T11:46:05.481+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-46-add-tags
  base_branch: main
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-46: Add tags to bookmarks

## Story

As a user of the bookmarks app,
I want to give a bookmark an optional list of tags,
so that I can group my bookmarks.

## Product Context

Source: Jira story [FIJIH-46](https://external-team-p2ipk4vi.atlassian.net/browse/FIJIH-46) "Add tags to bookmarks" (Story, Medium, label `scenario-S1`), no comments, no attachments, no Figma link.

From the issue:

- Context: "A bookmark gets an optional list of tags; the API accepts and returns them, and the page shows them next to the title."
- Issue acceptance criteria:
  - POST /bookmarks accepts an optional "tags" array of strings; each tag is trimmed, lower-cased, and deduplicated; an empty array is the default.
  - A tag longer than 32 characters or containing whitespace answers 400 with `{"error":"invalid tag"}`.
  - GET /bookmarks returns the tags of each bookmark.
  - The web page shows each bookmark's tags after its title, comma separated, and shows nothing when there are none.
  - Unit tests in packages/shared, packages/api, and packages/web cover the new behaviour.
- Decisions: tags are not filterable yet.
- Out of scope (issue): filtering or searching by tag; editing tags of an existing bookmark.

Open product questions (see Engineering Context > Open questions); the acceptance criteria below state the proposed answer where one is needed and are revised at plan approval if the answer differs.

## Acceptance Criteria

1. `POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed and lower-cased, and duplicates (after normalisation) are removed, keeping the first occurrence's position. The 201 response body carries the normalised `tags`; when `tags` is omitted the bookmark is stored and returned with `tags: []`. Example: `["  Work", "work", "News"]` is stored as `["work", "news"]`.
2. A tag that, after trimming, is longer than 32 characters or contains any whitespace character makes `POST /bookmarks` answer 400 with body exactly `{"error":"invalid tag"}`, and no bookmark is stored. A trimmed tag of exactly 32 characters is accepted. (Proposed, pending Q2 and Q3: a `tags` value that is not an array, a non-string element, and a tag that is empty after trimming answer the same 400 `{"error":"invalid tag"}`.)
3. `GET /bookmarks` returns a `tags` array on every bookmark (empty array when it has none), in the order stored.
4. The web page shows each bookmark's tags after its title link, joined with `, ` (for example `work, news`). A bookmark with no tags renders no tag element and no separator text, so its row is unchanged from today.
5. Vitest tests in `packages/shared`, `packages/api`, and `packages/web` cover criteria 1–4, including the unhappy paths of criterion 2.
6. `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass from the repository root, and `measure/baseline.json` holds the `web_bundle_gzip_bytes` value printed by `pnpm build && pnpm measure` on this branch (AGENTS.md: a change that knowingly moves the bundle size updates the baseline in the same pull request).

## Tasks and Subtasks

- [x] Shared tag model and normalisation in `packages/shared/src/index.ts` (AC: 1, 2, 3)
  - [x] Add `tags: string[]` to `Bookmark`; make `NewBookmark` accept an optional `tags?: readonly string[]`.
  - [x] Add a pure `normalizeTags(input: unknown): string[]` (or an equivalent validate + normalise pair) that trims, lower-cases, de-duplicates keeping first occurrence, returns `[]` for `undefined`, and signals an invalid tag (length > 32 after trimming, internal whitespace, and per Q2/Q3 non-array, non-string, empty) without depending on the api's `ValidationError`. Export a `MAX_TAG_LENGTH = 32` constant.
  - [x] Vitest cases in `packages/shared/src/index.test.ts`: trim, lower-case, dedupe order, default `[]`, 32 accepted, 33 rejected, internal space/tab rejected, and the Q2/Q3 cases.
- [x] API accepts, validates, stores, and returns tags (AC: 1, 2, 3)
  - [x] `packages/api/src/app.ts`: pass `body.tags` through to `store.add` unchanged (no coercion), so the store validates it.
  - [x] `packages/api/src/store.ts`: normalise tags with the shared helper after the existing title and URL checks; on an invalid tag throw `ValidationError("invalid tag")` so the existing handler answers 400 `{"error":"invalid tag"}`; store `tags` on the bookmark.
  - [x] Vitest cases in `packages/api/src/app.test.ts`: POST with tags returns normalised tags (201); POST without tags returns `tags: []`; GET lists tags per bookmark; POST with a 33-character tag and with `"a b"` answers 400 `{"error":"invalid tag"}` and the bookmark is absent from a following GET; the Q2/Q3 cases.
- [x] Web page shows tags after the title (AC: 4)
  - [x] `packages/web/src/render.ts`: when `bookmark.tags.length > 0`, append after the link an element (for example `<span class="tags">`) whose `textContent` is `tags.join(", ")`; append nothing otherwise. Use `textContent`, never `innerHTML`.
  - [x] Update fixtures in `packages/web/src/render.test.ts` for the new required `tags` field and add cases: two tags render `work, news` after the title; no tags renders no tag element and the row text is title + `Remove` only.
- [ ] Live check of the web page against the API (AC: 1, 3, 4)
  - [ ] Run `pnpm --filter @sample/api start` and `pnpm --filter @sample/web dev`, create one bookmark with tags (via `curl -X POST` to the api, or the form if Q1 adds it) and one without, and record in Validation Evidence that the page shows `<title> work, news` for the first and only the title for the second.
- [ ] Root checks and bundle baseline (AC: 5, 6)
  - [ ] Run `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root.
  - [ ] Run `pnpm build && pnpm measure`; if `web_bundle_gzip_delta` is non-zero, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in its own `chore:` commit, and record before/after values in Validation Evidence.
- [x] Update the `packages/shared` row in `README.md` to mention tag normalisation (AC: 6)

## Engineering Context

- Workspace: pnpm; `@sample/shared` is imported from source by `@sample/api` and `@sample/web` (AGENTS.md).
- Controlling code:
  - `packages/shared/src/index.ts` — `Bookmark`, `NewBookmark = Pick<Bookmark, "url" | "title">`, URL helpers, `sortByCreatedDesc`. Adding a required `tags` to `Bookmark` makes `NewBookmark` need an explicit optional `tags` (not via `Pick`), and every `Bookmark` literal (web test fixture) must gain `tags`.
  - `packages/api/src/store.ts` — `BookmarkStore.add` validates title, then URL, then duplicate URL, then builds the `Bookmark`. Tag validation goes after these, so existing error precedence is unchanged; nothing is stored when it throws.
  - `packages/api/src/app.ts` — `POST /bookmarks` casts the JSON body and maps `ValidationError` to 400 `{ error: message }`; no new route or error mapping is needed.
  - `packages/web/src/render.ts` — `renderList` builds `<li><a/>…<button>Remove</button></li>`; `packages/web/index.html` styles `li` as flex with `justify-content: space-between`, so the tag element sits between the link and the button. Keep the link and tags together visually only if it needs no new CSS; no visual design is specified.
  - `packages/web/src/main.ts` — the add form sends only `title` and `url`.
- Interpretation of the issue (to confirm at plan approval, see Q3): validation runs on the trimmed tag, so `" Work "` is valid and becomes `"work"`; "longer than 32 characters" uses JavaScript string length of the trimmed tag; "whitespace" is any `\s` character.
- No persistence migration: the store is in memory.
- Changeset: Delivery adds it (AGENTS.md: summary "Add tags to bookmarks", the pull request title without the Jira key); not an Implementation task.
- Labels/reviewers for Delivery: Story → `enhancement`; reviewers per TEAMS.md (QA Engineer `duckyduff369`).
- Note: a local branch `FIJIH-45-add-tags` (a different Jira issue) holds an earlier implementation of a similar feature. This work item does not use it, and its decisions do not apply to FIJIH-46.

### Open questions

- Q1 — Add form: the issue says the page *shows* tags but does not say the add form can *set* them, so tags could only be set through the API. Is a tags input on the web add form in scope? Proposed: out of scope (the issue only names display).
- Q2 — Malformed `tags`: what does `POST /bookmarks` answer when `tags` is present but not an array (`"work"`, `null`, `{}`), or holds a non-string element (`[1]`)? Proposed: 400 `{"error":"invalid tag"}`.
- Q3 — Empty tag and trim-first reading: should a tag that is empty after trimming (`""`, `"   "`) be rejected with 400 `{"error":"invalid tag"}` (proposed) or dropped silently? And do you confirm that length and whitespace checks apply after trimming (so `" Work "` is accepted as `"work"`)?
- Q4 — README: the README layout row for `packages/shared` lists "URL validation and normalisation, sorting". Should it be updated to mention tag normalisation in this change? Proposed: yes.

## Testing Strategy

- Unit (Vitest, `packages/shared`): `normalizeTags` happy paths (trim, lower-case, dedupe keeping first occurrence, default `[]`, boundary 32) and unhappy paths (33 characters, internal space, tab, and the Q2/Q3 cases). `pnpm --filter @sample/shared test`.
- Integration (Vitest, `packages/api`, real `http` server on an ephemeral port as in the existing suite): POST with and without tags, GET returns tags, 400 `{"error":"invalid tag"}` cases with a follow-up GET proving nothing was stored. Note the suite shares one server and store across tests: use distinct URLs per test to avoid the duplicate-URL 400. `pnpm --filter @sample/api test`.
- Unit (Vitest + jsdom, `packages/web`): rendered text with two tags, no tag element with an empty list, existing empty-state and Remove tests still pass. `pnpm --filter @sample/web test`.
- Live app check: the "Live check of the web page against the API" task (AC 1, 3, 4).
- Root checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`; `pnpm build && pnpm measure` for the bundle baseline (AC 6).
- No migration, design, or release work beyond the baseline update and Delivery's changeset.

## Operational Requirements

- Required status check `test` (GitHub Actions, integration 15368) must pass before merge into `main`; this change adds, removes, or renames no CI job, and the `test` job runs on `pull_request` for every branch — where: repository ruleset `main` (id 26033321) on `panz3r/fijih-sample`, and `.github/workflows/ci.yml`; evidence: `gh api repos/panz3r/fijih-sample/rulesets/26033321` → enforcement `active`, target `~DEFAULT_BRANCH`, `required_status_checks: [{context: "test", integration_id: 15368}]`; owner: repository admins (`panz3r`).
- One approving review, squash merge only — where: ruleset `main` (id 26033321), rule `pull_request`; evidence: same call → `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; repository settings `gh api repos/panz3r/fijih-sample` → `allow_squash_merge: true`, `delete_branch_on_merge: true`; owner: repository admins (`panz3r`). The approval comes from the QA Engineer `duckyduff369` per TEAMS.md.

## File List

- `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`
- `packages/api/src/store.ts`, `packages/api/src/app.ts`, `packages/api/src/app.test.ts`
- `packages/web/src/render.ts`, `packages/web/src/render.test.ts`
- `README.md`

## Implementation Record

### Task 1 — shared tag model and normalisation

`Bookmark.tags: string[]`, `NewBookmark` gains optional `tags`, `MAX_TAG_LENGTH = 32`, and `normalizeTags(input: unknown): string[] | null` (null signals an invalid tag; checks run after trimming and lower-casing; empty, non-string, non-array, over-length and whitespace all invalid). Hypothesis: a pure helper returning null keeps the api free of shared-side error types; checked by the shared tests (11 passed in `pnpm --filter @sample/shared test`).

### Task 2 — API accepts, validates, stores, and returns tags

`app.ts` passes `body.tags` through untouched; `store.ts` normalises after the title, URL and duplicate checks and throws `ValidationError("invalid tag")`. `pnpm --filter @sample/api test`: 11 passed, including 33-character, whitespace, empty, non-string, non-array and null cases each followed by a GET proving nothing was stored.

### Task 3 — web page shows tags after the title

`render.ts` appends `<span class="tags">` (via `textContent` of `tags.join(", ")`) between the link and Remove only when `tags.length > 0`; the existing flex layout needs no CSS. Fixtures gained `tags: []`; new cases cover `work, news` and the no-tags row (`ExampleRemove`). `pnpm --filter @sample/web test`: 4 passed.

### Task 6 — README packages/shared row

The row now reads "URL validation and normalisation, tag normalisation, sorting" (Q4 approved).

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- 2026-10-29: Plan drafted from FIJIH-46 at revision 2026-10-29T11:46:05.481+0100; issue assigned to Mattia Panzeri.
- 2026-10-29: Approved: plan-approval — Approve as proposed.
- 2026-10-29: Plan approval accepts the proposed answers: Q1 form tags input out of scope (its conditional subtask removed); Q2 non-array/non-string tags answer 400 `invalid tag`; Q3 empty-after-trim tags rejected, checks run after trimming; Q4 README `packages/shared` row is updated (its task is now unconditional).
- 2026-10-29: Tasks 1 and 2 implemented and checked off.
- 2026-10-29: Task 3 implemented and checked off.
- 2026-10-29: README task done.
