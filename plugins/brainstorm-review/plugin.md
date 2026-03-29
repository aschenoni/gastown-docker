+++
name = "brainstorm-review"
description = "Review parked and stale brainstorm beads for triage"
version = 1

[gate]
type = "cooldown"
duration = "7d"

[tracking]
labels = ["plugin:brainstorm-review", "category:hygiene"]
digest = true

[execution]
timeout = "5m"
notify_on_failure = true
severity = "low"
+++

# Brainstorm Review — Stale Item Triage

This plugin runs weekly (7-day cooldown) during Deacon patrol. It finds
brainstorm beads that are parked, awaiting research, or abandoned, checks
whether they're overdue or superseded, and reports to the Mayor for triage.

## What it does

1. Queries all open brainstorm beads (`category:brainstorm`)
2. Checks `revisit-by` dates against today
3. Cross-references with recent specs, closed beads, and merged PRs
4. Generates a triage report with recommendations (close, resume, extend)
5. Mails Mayor only if there are items needing attention
6. Records a silent run wisp if everything is fresh

## Dispatch

```bash
gt dog dispatch --formula mol-dog-brainstorm-review
```

## Output

- **Mail to Mayor** (if items to triage): subject includes counts
- **Run wisp** (always): `plugin:brainstorm-review,result:success`

## Silence principle

If all brainstorms are within their review dates, the dog records a
run wisp and returns to kennel without mailing anyone. Silence = healthy.
