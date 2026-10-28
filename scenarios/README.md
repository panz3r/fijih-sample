# FIJIₕ scenarios

Each note describes one lifecycle path: the Jira issue to create, the repository precondition, the checkpoints to expect, and how to reset. Scenarios refer to issues by note name, never by Jira key, because `scripts/seed-jira` creates a new issue each time. A note with an `Issue: S1.` line reuses S1's issue text.

## Running one

1. `scripts/reset` (or the precondition the note names).
2. `scripts/seed-jira scenario <id>` (the note's own id, for example `S21`) and use the key it prints, never an issue from an earlier run: FIJIₕ resumes a key from the issue, pull request, and branch that run left behind, so a reused key goes straight to its last step. Each new issue is labelled `scenario-<id>`. `scripts/seed-jira check` first shows the project's issue types; the project needs Story, Bug, and Task.
3. In an agent session at the repository root with FIJIₕ installed: `/fiji-orchestrate-development <KEY>`.
4. Follow the note's checkpoints. For human-review steps, run `scripts/review-as-qa` as the note says.
5. `scripts/reset` when done; close the pull request instead of merging unless the note needs a merge. With the Jira variables set, the reset also moves every issue labelled `scenario-*` to Done and archives it, so finished runs leave the board and backlog; `--keep-issues` (or `--keep-prs`) leaves them for a run that continues later.

Install the FIJIₕ build under test from a local checkout so the sample follows the branch being reviewed: `apm install /path/to/fijih --target claude,agent-skills` (then `apm audit --ci`). Secrets for the scripts: `QA_GH_TOKEN` (QA Engineer account), `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (classic or scoped Atlassian API token; calls go through the `api.atlassian.com` gateway). Archiving in `scripts/reset` needs a Jira Premium site; elsewhere the issues stay Done.

## Catalogue

| Id | Path exercised | Precondition |
|---|---|---|
| [S1](S1.md) | Happy path: automatic `implementation-approval`, Copilot pass, QA approval, handoff comment, cleanup | baseline |
| [S2](S2.md) | `(verify: ci)` criterion met by `ci / measure` | baseline |
| [S3](S3.md) | `(verify: ci)` criterion unmet, `ci-fail` re-entry | baseline |
| [S4](S4.md) | Measurement problem: stale `measure/baseline.json` on `main` | baseline + stale baseline |
| [S5](S5.md) | Measuring job not triggered on pull requests (`nightly / full-measure`) | baseline |
| [S6](S6.md) | Copilot findings round | baseline |
| [S7](S7.md) | Human review: thread, changes requested, review-body finding, approval | baseline |
| [S8](S8.md) | Scope change at `local-qa-review`: Narrowing, Inline, Full | baseline |
| [S9](S9.md) | Two stacked work items for one issue | baseline |
| [S10](S10.md) | Image-only issue | baseline |
| [S11](S11.md) | Figma-linked issue | baseline |
| [S12](S12.md) | `fiji-setup-project` install and convention inference | `bare` branch |
| [S13](S13.md) | `fiji-prepare-jira-issue` refine, split, readiness check | baseline |
| [S14](S14.md) | Source drift after Plan approval | baseline |
| [S15](S15.md) | Preflight blocks: no remote, no `jq` | local only |
| [S16](S16.md) | Resume from another session or a linked worktree | any |
| [S17](S17.md) | User-requested rework at `ready-for-review` | baseline |
| [S18](S18.md) | Base moved after Cleanup: Base Sync and a conflicting pull request | baseline |
| [S19](S19.md) | Model routing shadow report and retrospective | `AI-MODELS.md` present |
| [S20](S20.md) | Held work-item-only pushes: count pushes and CI runs | baseline |
| [S21](S21.md) | Post-cleanup reverification watches a required check still running | baseline + `CI_DELAY_SECONDS` |
