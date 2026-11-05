# fijih-sample

A deliberately small bookmarks application whose only job is to give [FIJIₕ](https://github.com/panz3r/fijih) something to work on. Every FIJIₕ lifecycle path has a scenario here that reproduces it on demand, so changes to FIJIₕ can be tested without waiting for real work.

## Layout

| Path | What it is |
|---|---|
| `packages/shared` | Types and pure functions (URL validation and normalisation, sorting). Tests with Vitest. |
| `packages/api` | A Node `http` service with an in-memory store: `GET/POST /bookmarks`, `DELETE /bookmarks/:id`, `GET /health`. |
| `packages/web` | A Vite + vanilla TypeScript page that lists, adds, and removes bookmarks through the API. Its gzipped bundle size is the value CI measures. |
| `scripts/measure` | Prints the gzipped web bundle size and its delta against `measure/baseline.json`. |
| `scenarios/` | One note per FIJIₕ scenario: the Jira issue to create, the repository precondition, and the checkpoints to expect. |
| `scripts/` | `seed-jira`, `reset`, and `review-as-qa` support the scenarios. |

## Bookmark tags

`POST /bookmarks` accepts an optional `tags` array of strings. Each tag is trimmed, lower-cased, and deduplicated, and the response and `GET /bookmarks` return the normalized `tags` (`[]` when omitted). A tag longer than 32 characters or containing whitespace is rejected with `400 {"error":"invalid tag"}` and nothing is stored. Tags cannot be filtered or edited yet.

## Develop

Node 24 and pnpm 12 (`corepack enable` picks the pinned version).

```sh
pnpm install
pnpm test        # all packages
pnpm lint
pnpm typecheck
pnpm build       # web bundle into packages/web/dist
pnpm measure     # after build
pnpm --filter @sample/api start   # http://localhost:3000
pnpm --filter @sample/web dev     # proxies /bookmarks to the api
```

CI (`.github/workflows/ci.yml`) runs `test`, `lint`, `typecheck`, and `measure` on every pull request. `nightly.yml` runs only by hand.

## FIJIₕ

Conventions FIJIₕ reads live in `AGENTS.md`, `TEAMS.md`, and `AI-MODELS.md`. See `scenarios/README.md` for how to run a scenario and reset afterwards.
