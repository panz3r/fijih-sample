---
schema: fiji/work-item/v1
id: FIJIH-69
workflow: fiji/orchestrate-development/v1
source:
  provider: jira
  key: FIJIH-69
  revision: 2026-11-02T16:14:50.581+0100
lifecycle:
  status: active
  phase: implementation
  checkpoint: null
  transition: plan-complete
  attempt: 1
quality:
  gate: pending
artifacts:
  branch: FIJIH-69-bookmarks-csv-endpoint
  base_branch: null
  pull_request: null
  jira_context_comment_id: null
---

# Work Item FIJIH-69: Export bookmarks as CSV (api endpoint)

## Story

As a bookmarks user,
I want the API to return my bookmarks as a CSV file,
so that I can export my list and use it outside the app.

## Product Context

- Source: Jira FIJIH-69 "Export bookmarks as CSV" (Story, no comments).
- The issue asks for: `GET /bookmarks.csv` answering `text/csv` with a header row and one row per bookmark (title, url, createdAt), newest first; an Export button on the web page that downloads `/bookmarks.csv`; tests covering the endpoint and the button.
- Work item split (issue "Decisions"): work item "api" (the endpoint) and work item "web" (the button), the web item stacked on the api branch. This is the "api" item, the first work item for FIJIH-69, so its id is the Jira key and its pull request targets `main`. The "web" item is a later work item (`FIJIH-69-web`) whose `artifacts.base_branch` is this item's branch, `FIJIH-69-bookmarks-csv-endpoint`.
- Out of scope here, per the issue's Decisions: the web Export button and its test (they belong to the "web" item).
- No Figma or other design source is referenced.

## Acceptance Criteria

1. `GET /bookmarks.csv` responds `200` with a `content-type` of `text/csv; charset=utf-8` and a `content-disposition` of `attachment; filename="bookmarks.csv"`.
2. The body's first record is the header `title,url,createdAt`, followed by exactly one record per stored bookmark holding that bookmark's `title`, `url`, and `createdAt` in those columns, in the same newest-first order `GET /bookmarks` returns (including bookmarks created in the same millisecond). Every record, the header included, ends with CRLF.
3. With no bookmarks stored, the body is the header record only (`title,url,createdAt\r\n`).
4. A field containing a comma, a double quote, CR, or LF is enclosed in double quotes with each inner double quote doubled (RFC 4180), so every bookmark still parses back as exactly one record of three fields with its original values; other fields are written unquoted.
5. Existing routes keep their behaviour: `GET /health`, `GET /bookmarks`, `POST /bookmarks`, and `DELETE /bookmarks/:id` respond as before, and the existing API tests pass unchanged.
6. Vitest tests in `packages/api` cover criteria 1–4 (the issue's "tests cover the endpoint").
7. The `packages/api` row of the `README.md` package table lists `GET /bookmarks.csv` alongside the existing routes.

## Tasks and Subtasks

- [x] Add a pure CSV serializer in `packages/api/src/csv.ts` (for example `bookmarksToCsv(bookmarks: readonly Bookmark[]): string`) that writes the header and one CRLF-terminated record per bookmark with RFC 4180 field escaping (AC: 2, 3, 4)
  - [x] Unit tests in `packages/api/src/csv.test.ts`: header only for an empty list; column order and CRLF terminators; a title containing a comma, a double quote, and a line break round-trips as one quoted field; plain fields stay unquoted (AC: 2, 3, 4, 6)
- [x] Add the `GET /bookmarks.csv` route in `packages/api/src/app.ts`, serializing `store.list()` and answering `200` with `content-type: text/csv; charset=utf-8` and `content-disposition: attachment; filename="bookmarks.csv"` (the existing `send` helper writes JSON only, so add a text writer or extend it) (AC: 1, 2, 5)
  - [x] Integration tests in `packages/api/src/app.test.ts` against a fresh store: status, content type, and content disposition; header-only body when empty; after adding two bookmarks, rows newest first with the right values; existing tests left unchanged (AC: 1, 2, 3, 5, 6)
- [ ] Add `GET /bookmarks.csv` to the `packages/api` row of the package table in `README.md` (AC: 7)

## Engineering Context

- Controlling code: `packages/api/src/app.ts` (route dispatch on `req.method` and `url.pathname`; `send` always writes `application/json`), `packages/api/src/store.ts` (`BookmarkStore.list()` already returns newest first with same-millisecond ties newest first, via `sortByCreatedDesc` in `@sample/shared`). Reuse `store.list()` for ordering; do not re-sort.
- Routing: `/bookmarks.csv` does not match the existing `^/bookmarks/([^/]+)$` DELETE pattern and is not `/bookmarks`, so an exact `GET` + `pathname === "/bookmarks.csv"` branch placed with the other `GET` routes is enough. Other methods on `/bookmarks.csv` keep falling through to the existing `404`.
- Imports: the API runs under `node --experimental-strip-types`, so relative imports use the `.ts` extension (`import { bookmarksToCsv } from "./csv.ts"`, as `app.ts` imports `./store.ts`; see commit 465c84b) and type-only imports use `import type`.
- Serializer placement: `packages/api` only, since only the API uses it; `packages/shared` stays unchanged. Escaping follows RFC 4180: quote a field when it contains `,`, `"`, `\r`, or `\n`, doubling inner `"`. Records are CRLF-terminated per RFC 4180.
- Test isolation: `app.test.ts` shares one server and store across its tests ("starts empty" relies on running first). New CSV tests use their own `createApp(new BookmarkStore())` server (or a separate `describe` with its own `beforeAll`/`afterAll`) so their data neither depends on nor leaks into the existing tests. Use the `now` parameter of `BookmarkStore.add` where deterministic `createdAt` values help.
- Web follow-up (not this item): the Vite dev proxy key `/bookmarks` prefix-matches `/bookmarks.csv`, so the "web" item's button can call the same path in development.
- Change intent: Delivery adds a changeset for `@sample/api` whose summary is the pull request title without the Jira key ("Export bookmarks as CSV"), per `AGENTS.md`.
- Bundle size: the web bundle is unchanged by this item, so `measure/baseline.json` stays as is.

### Defaults taken at plan approval

- Add `GET /bookmarks.csv` to the README API routes row — in scope (AC 7).
- Send `content-disposition: attachment; filename="bookmarks.csv"` — yes (AC 1).
- Spreadsheet formula-injection neutralising — none; values are exported as stored (AC 4).
- RFC 4180 quoting and CRLF record terminators — confirmed (AC 2, 4).
- Live smoke check (former task 3) — deferred by the user; removed from the tasks.

## Testing Strategy

- Unit (Vitest, `packages/api/src/csv.test.ts`): empty list, ordering and columns as given, CRLF terminators, RFC 4180 escaping of comma, double quote, CR, and LF, and unquoted plain fields.
- Integration (Vitest, `packages/api/src/app.test.ts`): real `http` server on an ephemeral port with an isolated store; status, `content-type`, `content-disposition`, empty body, newest-first rows; existing route tests unchanged (regression for AC 5).
- Unhappy paths: a title with special characters (unit); no bookmarks (unit and integration). The endpoint takes no input, so there is no validation path.
- Live check: deferred by the user at plan approval; no live smoke check is a task of this item.
- Repository checks from the root before each commit: `pnpm test`, `pnpm lint`, `pnpm typecheck` (package-scoped: `pnpm --filter @sample/api test`, `pnpm lint packages/api`, `pnpm --filter @sample/api typecheck`).
- No migration, design, or release work: the store is in memory and nothing is deployed.

## Operational Requirements

- Pull requests into `main` need the `test` status check to pass — where: repository ruleset `main` (id 26033321, enforcement `active`, target `~DEFAULT_BRANCH`); evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` → `required_status_checks: [{context: "test", integration_id: 15368}]`, and `.github/workflows/ci.yml` runs job `test` on `pull_request`; owner: repository administrators (`panz3r`).
- Pull requests into `main` need one approving review and merge by squash only — where: same ruleset; evidence: `gh api repos/panz3r/fijih-sample/rules/branches/main` → `pull_request` rule with `required_approving_review_count: 1`, `allowed_merge_methods: ["squash"]`; owner: repository administrators (`panz3r`). Per `TEAMS.md` the approval comes from the QA Engineer `duckyduff369`.
- No classic branch protection on `main` — evidence: `gh api repos/panz3r/fijih-sample/branches/main/protection` → `404 Branch not protected`.
- This item adds, removes, or renames no CI check contexts.

## File List

- packages/api/src/csv.ts
- packages/api/src/csv.test.ts
- packages/api/src/app.ts
- packages/api/src/app.test.ts

## Implementation Record

Task 1 — Added `bookmarksToCsv` (RFC 4180 quoting, CRLF-terminated records) in `packages/api/src/csv.ts` with unit tests in `csv.test.ts`.
Task 2 — Added `GET /bookmarks.csv` route with a `sendCsv` writer (`text/csv; charset=utf-8`, `content-disposition: attachment; filename="bookmarks.csv"`) serializing `store.list()`; integration tests use their own isolated store and server.

## Validation Evidence

## Quality Gate

## Review Record

## Change Log

- Plan repair (plan-approval, conditional approval): "Answers: 1) yes, add the route to the README API routes row. 2) yes, send content-disposition: attachment; filename=\"bookmarks.csv\". 3) no formula-injection neutralising. 4) confirmed: RFC 4180 quoting and CRLF terminators. 5) defer the live smoke check (task 3). With those answers, approve the plan." Applied: README task and AC 7 added; `content-disposition` added to AC 1, the route task, and its integration test; formula-injection neutralising declined (AC 4 unchanged); RFC 4180 and CRLF confirmed; live smoke check task removed; open decisions recorded under Defaults taken at plan approval.
- Approved: plan-approval — conditional: Answers: 1) yes, add the route to the README API routes row. 2) yes, send content-disposition: attachment; filename="bookmarks.csv". 3) no formula-injection neutralising. 4) confirmed: RFC 4180 quoting and CRLF terminators. 5) defer the live smoke check (task 3). With those answers, approve the plan. (verified at 0416a16bc1fb96258197ddff49ce56b00948e62d) (answering: Task 3 is the live smoke check ... Do you want to defer this check now, or keep it?)
