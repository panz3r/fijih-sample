---
title: "Short name of the path exercised (also the catalogue text); quote it, backticks are reserved in YAML"
precondition: "baseline"          # catalogue column; "baseline + <extra>" when more is needed
issue:                            # omit when the scenario has no Jira issue
  reuse: S1                       # either this, pointing at a note with its own issue...
  # type: Story                   # ...or these three (Story, Bug, or Task)
  # summary: One-line summary
  # description: |
  #   h2. Context
  #   Jira wiki markup, kept byte for byte by scripts/seed-jira.
---
# Sn. Title (the same text as the frontmatter title)

One or two sentences: the FIJIₕ path this exercises and what sets it apart from its nearest sibling.

## Precondition

- `scripts/reset`
- Anything else the run needs first: a repository variable, a tag, an environment change.

## Run

Steps after `scripts/seed-jira scenario Sn` and `/fiji-orchestrate-development <KEY>`. Each step is what the tester does, then what to see.

1. Do this. **Expect:** what the checkpoint, pull request, Jira issue, or commits show.
2. **Expect:** a step with nothing to do, only something to observe.

### (a) Variant

Use sub-headings only when one note covers independent variants.

## Reset

- `scripts/reset`
- Whatever the precondition changed, undone.
