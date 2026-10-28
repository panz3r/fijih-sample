---
name: add-scenario
description: Adds a scenario note to scenarios/ for a FIJIₕ behaviour, or updates the notes a FIJIₕ change affects, following scenarios/_TEMPLATE.md with expectations taken from the installed FIJIₕ skills. Use when a FIJIₕ change adds or alters a lifecycle path, or when a run exposed a path no note covers.
argument-hint: The FIJIₕ behaviour or change to cover, with the skill, issue, or pull request that defines it.
---
# Add or update a scenario

A scenario note is a test case a person runs by hand, so every expectation must be something they can see at a checkpoint, on the pull request, in Jira, or in `git log`. The structure is enforced by `scripts/check-scenarios`; this skill is about the content.

## 1. Find the behaviour in the FIJIₕ source

Read the installed skill or reference that defines the behaviour under `.agents/skills/fiji-*/` (the orchestrator's rules are in `fiji-orchestrate-development/SKILL.md` and its `references/`: `lifecycle.md`, `phase-contract.md`, `resume.md`, `scope-change.md`, `ci-evidence.md`, `model-routing.md`). When the argument names a FIJIₕ issue or pull request, read it with `gh` for the intended behaviour, then confirm it in the installed build. If the skills are not installed, say so and stop: the install line is in `scenarios/README.md`.

Take names literally from the source: checkpoint ids (`local-qa-review`), transitions (`ci-unmet`), work-item fields (`lifecycle.attempt`, `evidence.held_commits`), Change Log entries, commit subjects. A paraphrased rule cannot be checked at a checkpoint.

## 2. Decide between a new note and an edit

Read the catalogue in `scenarios/README.md` and the notes whose title or Run steps touch the same phase. Extend an existing note when the new behaviour is a step inside a path it already runs (S2 to S5 are one family of `(verify: ci)` cases); add a note when the path, precondition, or issue differs. When a FIJIₕ change alters an existing behaviour, grep the notes for the old names (`grep -rn '<old checkpoint or transition>' scenarios/`) and update every hit; the catalogue must not describe a build that no longer exists.

## 3. Write the note

Copy `scenarios/_TEMPLATE.md` to the next free `Sn.md`. The template documents the frontmatter; quote `title` and `precondition`, since backticks are reserved in YAML.

- **Issue.** `reuse: S1` unless the path depends on issue content. Write an own issue only then, in the house format of the siblings (`h2.` sections Context, Acceptance criteria, Decisions, Out of scope), with criteria a reviewer can verify and `(verify: ci)` on a criterion that a named CI job decides. Leave `description: ""` when the tester must fill the issue by hand (S10), or a placeholder line they replace (S11).
- **Precondition.** `scripts/reset` first unless the note needs another state (a tag, a stale file on `main`, a repository variable). Anything set here is undone under Reset.
- **Run.** Steps after the seed and the `/fiji-orchestrate-development <KEY>` command, in run order. Each step is what the tester does, then `**Expect:**` and what they see. Prefer few steps that can fail over many that cannot. Use `### (a)` sub-headings only for independent variants. Explain a non-obvious mechanism in one paragraph before the list, as S21 does, rather than inside a step.
- **Reset.** `scripts/reset` plus the inverse of every precondition line.

Do not restate FIJIₕ rules in the note; name the observable result. Keep the sample public-safe: no names of other projects, no Jira keys from other sites, no local paths.

## 4. Check and land

1. `scripts/check-scenarios --write` validates the notes and regenerates the catalogue; fix what it reports.
2. `git diff` the result for anything private, then commit to `main` with a Conventional Commits subject (`docs: add S22 for …` or `docs: update S7 and S17 for …`).
3. Move the baseline: `git tag -f baseline && git push origin main && git push -f origin refs/tags/baseline`. Do not push while a FIJIₕ run on this repository is between Cleanup and post-cleanup reverification (an open pull request whose last commit removes the work item): the push moves its base.
4. Tell the user the handbook, which lives outside the repository, has a scenario catalogue to regenerate from the frontmatter.
