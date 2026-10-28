# fijih-sample contributor guidelines

This repository exists to exercise FIJIₕ. Keep changes small and the checks fast.

## Repository

- pnpm workspace: `packages/shared` (types and pure functions), `packages/api` (Node `http` service), `packages/web` (Vite page). `shared` is imported by the other two from source.
- Non-product files: `measure/baseline.json`, `scenarios/`, and `scripts/` (other than `scripts/measure`).

## Git

- Branch naming: `<JIRA-KEY>-<short-kebab-slug>`, for example `SCRUM-12-add-tags`. The Jira key keeps its upper case.
- Commits follow Conventional Commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `ci:`. One logical change per commit, subject in the imperative, under 72 characters.
- Pull requests are squash-merged into `main`; the branch is deleted on merge.
- The `gh` CLI may be used for GitHub reads and writes.

## Checks

Run from the repository root before every commit, and CI (`.github/workflows/ci.yml`) runs the same on every pull request:

| Package | Test | Lint | Type-check |
|---|---|---|---|
| all | `pnpm test` | `pnpm lint` | `pnpm typecheck` |
| `packages/shared` | `pnpm --filter @sample/shared test` | `pnpm lint packages/shared` | `pnpm --filter @sample/shared typecheck` |
| `packages/api` | `pnpm --filter @sample/api test` | `pnpm lint packages/api` | `pnpm --filter @sample/api typecheck` |
| `packages/web` | `pnpm --filter @sample/web test` | `pnpm lint packages/web` | `pnpm --filter @sample/web typecheck` |

Every behaviour change comes with a Vitest test in the package it changes. `pnpm build` then `pnpm measure` prints the gzipped web bundle size; a pull request that knowingly moves it updates `measure/baseline.json` in the same change.

## Pull requests

- Title: `[<JIRA-KEY>] <Jira issue summary>`.
- Change intent: every pull request that changes a package adds a changeset in `.changeset/` (`pnpm changeset`). Its summary is the pull request title without the Jira key. A pull request that changes only non-product files or CI adds none.
- Labels: `bug` when the Jira issue type is Bug, otherwise `enhancement`.
- Reviewers: the owning team in [TEAMS.md](TEAMS.md). A pull request needs one approval, from the team's QA Engineer, before it is ready to merge.
- Required check: the `test` job of the `ci` workflow (enforced by the `main` ruleset).

## Jira

- Project `SCRUM`. When work starts on an issue, move it to `In Progress`.

## AI tooling

FIJIₕ is installed per test session with APM from a local checkout (`apm install /path/to/fijih --target claude`, see [scenarios/README.md](scenarios/README.md)); `apm.yml`, the lock, and the deployed skills are not tracked. Model tiers are in [AI-MODELS.md](AI-MODELS.md).
