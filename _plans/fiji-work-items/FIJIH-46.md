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
  phase: automated-review
  checkpoint: ready-for-review
  transition: ready-for-review
  attempt: 1
quality:
  gate: concerns
artifacts:
  branch: FIJIH-46-add-tags
  base_branch: main
  pull_request: https://github.com/panz3r/fijih-sample/pull/8
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
- [x] Live check of the web page against the API (AC: 1, 3, 4)
  - [x] Run `pnpm --filter @sample/api start` and `pnpm --filter @sample/web dev`, create one bookmark with tags (via `curl -X POST` to the api, or the form if Q1 adds it) and one without, and record in Validation Evidence that the page shows `<title> work, news` for the first and only the title for the second.
- [x] Root checks and bundle baseline (AC: 5, 6)
  - [x] Run `pnpm test`, `pnpm lint`, `pnpm typecheck` from the root.
  - [x] Run `pnpm build && pnpm measure`; if `web_bundle_gzip_delta` is non-zero, set `measure/baseline.json` `web_bundle_gzip_bytes` to the printed value in its own `chore:` commit, and record before/after values in Validation Evidence.
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

- `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts` (also changed by Copilot fix 4914d6a)
- `packages/api/src/store.ts`, `packages/api/src/app.ts`, `packages/api/src/app.test.ts`
- `packages/web/src/render.ts`, `packages/web/src/render.test.ts`
- `README.md`
- `measure/baseline.json`

## Implementation Record

### Task 1 — shared tag model and normalisation
(commit 87f9ca0)

`Bookmark.tags: string[]`, `NewBookmark` gains optional `tags`, `MAX_TAG_LENGTH = 32`, and `normalizeTags(input: unknown): string[] | null` (null signals an invalid tag; checks run after trimming and lower-casing; empty, non-string, non-array, over-length and whitespace all invalid). Hypothesis: a pure helper returning null keeps the api free of shared-side error types; checked by the shared tests (10 passed in `pnpm --filter @sample/shared test`).

### Task 2 — API accepts, validates, stores, and returns tags
(commit 87f9ca0)

`app.ts` passes `body.tags` through untouched; `store.ts` normalises after the title, URL and duplicate checks and throws `ValidationError("invalid tag")`. `pnpm --filter @sample/api test`: 11 passed, including 33-character, whitespace, empty, non-string, non-array and null cases each followed by a GET proving nothing was stored.

### Task 3 — web page shows tags after the title
(commit 8365553)

`render.ts` appends `<span class="tags">` (via `textContent` of `tags.join(", ")`) between the link and Remove only when `tags.length > 0`; the existing flex layout needs no CSS. Fixtures gained `tags: []`; new cases cover `work, news` and the no-tags row (`ExampleRemove`). `pnpm --filter @sample/web test`: 4 passed.

### Task 6 — README packages/shared row
(commit 14d7f6a)

The row now reads "URL validation and normalisation, tag normalisation, sorting" (Q4 approved).

### Task 4 — live check

Ran `pnpm --filter @sample/web dev` (Vite, proxy to :3000). `pnpm --filter @sample/api start` fails independently of this change (`ERR_MODULE_NOT_FOUND`: `server.ts` imports `./app.js`, which Node's strip-types cannot resolve to `app.ts`; untouched by this change), so the api was started from the same `src/server.ts` with `vite-node`. Through the Vite proxy: POST with `[" Work","news","WORK"]` returned `tags: ["work","news"]`, POST without tags returned `tags: []`, POST with `["a b"]` returned 400 `{"error":"invalid tag"}`, GET listed the tags. The page itself was not opened in a browser (browser automation permission was not granted); instead the real `renderList` was run in jsdom on the live GET response: row text `Taggedwork, newsRemove` with `<span class="tags">work, news</span>`, and `PlainRemove` with no tag element.

### Task 5 — root checks and baseline

`pnpm test` (10 + 11 + 4 passed), `pnpm lint`, `pnpm typecheck` pass. `pnpm build && pnpm measure` printed `web_bundle_gzip_bytes=881`, delta 46 against baseline 835; baseline set to 881 in its own `chore:` commit, re-measure delta 0.

### Copilot review fixes (automated-review, attempt 1)

Fix commit 4914d6a (`packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`): `normalizeTags` checks empty, length, and whitespace on the trimmed value before lower-casing, and de-duplicates with a `Set` (first-occurrence order kept). Two new shared tests: boundary-length tag with an expanding case mapping, and 50,000 unique tags in order. `pnpm test` (12 + 11 + 4 passed), `pnpm lint`, `pnpm typecheck` pass; `pnpm measure` still 881 (delta 0); `ci` run 40861858565 passed on 4914d6a. This closes quality-gate minor findings 1 and 2 (no tag-count cap was added).

## Validation Evidence

- AC-1: passed - shared normalizeTags tests, api POST test (`["  Work","work","News"]` -> `["work","news"]`), live curl via the Vite proxy.
- AC-2: passed - shared and api tests (33 chars, whitespace, empty, non-string, non-array, null; GET shows nothing stored); 32 chars accepted in shared test; live curl 400 `{"error":"invalid tag"}`.
- AC-3: passed - api GET test and live GET return `tags` on every bookmark.
- AC-4: passed - web render tests (`work, news`; no element without tags); live jsdom render of the real response. Not viewed in a real browser.
- AC-5: passed - tests in packages/shared, api, and web.
- AC-6: passed - root `pnpm test`, `pnpm lint`, `pnpm typecheck`; baseline 835 -> 881 matches `pnpm measure` (delta 0).

## Quality Gate

Gate: **concerns**. Every criterion has evidence, the root checks pass at the reviewed head, and no finding is blocking. Two minor findings and one residual risk remain.

Reviewed head: 958fd92 (full branch diff `main...FIJIH-46-add-tags`)

Validations re-run at the reviewed head: `pnpm test` exit 0 (shared 10, api 11, web 4 passed), `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm build` exit 0, `pnpm measure` printed `web_bundle_gzip_bytes=881`, `web_bundle_gzip_delta=0`.

### Acceptance trace

- AC-1: implemented by `normalizeTags` in `packages/shared/src/index.ts` (trims, lower-cases, de-duplicates keeping the first position, returns `[]` for `undefined`), called from `BookmarkStore.add` in `packages/api/src/store.ts`. `packages/api/src/app.ts` passes `body.tags` through unchanged. Verified by the shared `normalizeTags` tests, the api test "stores normalised tags and lists them" (`["  Work","work","News"]` gives `["work","news"]`, status 201), the api test "defaults to an empty tag list", and the live curl through the Vite proxy recorded in the Implementation Record.
- AC-2: implemented by the `null` return of `normalizeTags` (empty, longer than `MAX_TAG_LENGTH`, `\s`, non-string element, non-array value) and `ValidationError("invalid tag")` in `store.ts`, which throws before `items.set`. Verified by the shared tests (32 accepted, 33 rejected, length checked after trimming, space and tab rejected, `""`, `"   "`, `[1]`, `"work"`, `null`, `{}` rejected) and the api `it.each` cases (33 characters, `"a b"`, `"  "`, `[1]`, `"work"`, `null`), each answering 400 `{"error":"invalid tag"}` with a following GET that shows nothing was stored. The live curl also returned 400. See finding 1 for a Unicode edge case.
- AC-3: implemented because `tags` is stored on the `Bookmark`, and `store.list()` returns it. Verified by the api GET assertions in both tag tests (normalised order kept, `[]` when none) and the live GET.
- AC-4: implemented in `renderList` in `packages/web/src/render.ts`: it adds `<span class="tags">` with `textContent = tags.join(", ")` between the link and Remove only when `tags.length > 0`, and it does not use `innerHTML`. Verified by the web tests (row text `Examplework, newsRemove`; no `.tags` element and row text `ExampleRemove` without tags) and by the live check: the real `renderList` ran in jsdom on the live GET response. The page was not opened in a real browser. The user accepted this evidence at implementation-approval.
- AC-5: verified by Vitest tests in all three packages that cover AC 1–4 and the unhappy paths of AC-2. They pass at the reviewed head.
- AC-6: verified by `pnpm test`, `pnpm lint`, and `pnpm typecheck`, which pass from the root at the reviewed head. `measure/baseline.json` holds 881, which matches `pnpm measure` (delta 0).

Product decisions checked against the criteria: Q1–Q4 as approved match AC 1–4. The engineering decision to validate tags after the title, URL, and duplicate-URL checks means that a request with both a duplicate URL and an invalid tag answers `url already bookmarked`. AC-2 covers an otherwise valid request with an invalid tag, so this ordering does not contradict it.

### Findings

1. minor: `packages/shared/src/index.ts:53` applies the length check to the lower-cased tag, not the trimmed tag. A tag whose lower-case form has more UTF-16 code units than the original is rejected even when its trimmed length is 32 or less. Reproduced: `normalizeTags(["İ" + "a".repeat(31)])` (trimmed length 32) returns `null`, and `"İ".repeat(32)` (length 32, lower-cased length 64) returns `null`. AC-2 says "a trimmed tag of exactly 32 characters is accepted". This affects only non-ASCII input with expanding case mappings. A follow-up can check `raw.trim().length` before lower-casing.
2. minor: `packages/shared/src/index.ts:55` de-duplicates with `out.includes`, so the cost is quadratic in the number of tags. Neither the tag count nor the request body size is capped (`readJson` in `packages/api/src/app.ts` already buffers any body size before this change). Reproduced: `normalizeTags` takes about 73 ms for 10,000 unique tags and about 466 ms for 30,000. That time blocks the API event loop during a single POST. A follow-up can use a `Set` or cap the tag count.

### Residual risks

- The page was not rendered in a real browser. AC-4 rests on jsdom renders, and the user accepted this ("Approve; I accept the jsdom evidence for the page check."). With `li { display: flex; justify-content: space-between }`, the tag span sits between the title and Remove, not directly next to the title. The work item specifies no visual design. To confirm the layout, open the page in a browser with one tagged bookmark and one untagged bookmark.

### Notes outside this change

- `pnpm --filter @sample/api start` fails with `ERR_MODULE_NOT_FOUND`. The failure predates this change: the start script and `src/server.ts` are the same as on `main`.
- Commit 87f9ca0 leaves the web typecheck failing until 8365553. Only that intermediate commit is affected. The branch tip passes, and the pull request is squash-merged.

## Review Record

Copilot review 5696602764 on 39f5f1a, two threads:

- PRRT_kwDOVaYq_M6xhOs3 (`packages/shared/src/index.ts`, length checked after lower-casing): `valid`; fixed in 4914d6a; replied; resolved. Matches quality-gate minor finding 1. The user's local-qa-review decision to keep it as a follow-up is superseded because Copilot raised it and it contradicts AC-2 (trimmed 32-character tag accepted).
- PRRT_kwDOVaYq_M6xhOta (`packages/shared/src/index.ts`, quadratic de-duplication): `valid`; fixed in 4914d6a (`Set`; no tag cap, which would widen the contract); replied; resolved. Matches quality-gate minor finding 2.

Re-review requested at 2026-10-29T11:00:13Z; Copilot review 5696649144 on 4914d6a: approval recommended, no open issues.

## Change Log

- 2026-10-29: Plan drafted from FIJIH-46 at revision 2026-10-29T11:46:05.481+0100; issue assigned to Mattia Panzeri.
- 2026-10-29: Approved: plan-approval — Approve as proposed.
- 2026-10-29: Plan approval accepts the proposed answers: Q1 form tags input out of scope (its conditional subtask removed); Q2 non-array/non-string tags answer 400 `invalid tag`; Q3 empty-after-trim tags rejected, checks run after trimming; Q4 README `packages/shared` row is updated (its task is now unconditional).
- 2026-10-29: Tasks 1 and 2 implemented and checked off.
- 2026-10-29: Task 3 implemented and checked off.
- 2026-10-29: README task done.
- 2026-10-29: Tasks 4 and 5 done; implementation complete, awaiting implementation-approval.
- 2026-10-29: Approved: implementation-approval — Approve; I accept the jsdom evidence for the page check.
- 2026-10-29: Quality gate recorded: concerns (two minor findings, one residual risk) at reviewed head 958fd92.
- 2026-10-29: Finalize (local QA review): reconciled Implementation Record entries for Tasks 1, 2, 3, and 6 with their task commits (87f9ca0, 8365553, 14d7f6a); no other record changed. Task 4 (live check) and Task 5 (root checks and baseline) are checked but their entries were added by the work-item-only commit 958fd92 and cite no commit, so they are listed as task/evidence discrepancies; their acceptance evidence (AC-1, AC-3, AC-4, AC-6) is in Validation Evidence. Checkpoint local-qa-review set.
- 2026-10-29: Approved: local-qa-review — Approve; keep both findings as follow-ups.
- 2026-10-29: Delivery: changeset `.changeset/add-tags-to-bookmarks.md` pushed; draft PR #8 (https://github.com/panz3r/fijih-sample/pull/8) opened with label `enhancement`, Copilot review requested (timeline `review_requested`). Both quality-gate minor findings kept as follow-ups. No `(verify: ci)` criteria. Reviewer QA Engineer `duckyduff369` to be requested at ready-for-review.
- 2026-10-29: Copilot pass: 2 valid findings fixed in 4914d6a (the two quality-gate minor findings), threads resolved, re-review clean. Checkpoint ready-for-review set.
