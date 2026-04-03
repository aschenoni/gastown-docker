+++
name = "pulse-refresh"
description = "Weekly refresh of structured project data for pulse assessments"
version = 1

[gate]
type = "cooldown"
duration = "7d"

[tracking]
labels = ["plugin:pulse-refresh", "category:strategic"]
digest = true

[execution]
timeout = "5m"
notify_on_failure = true
severity = "low"
+++

# Pulse Refresh — Structured Data Collection

This plugin runs weekly (7-day cooldown) during Deacon patrol. It collects
structured project data across all rigs — git activity, bead state, Linear
tickets, metric staleness — and writes it to `mayor/pulse/data-refresh.md`.

Keeps the quantitative side of the project assessment warm between human
pulse sessions so the assessment document is already current when the founder
sits down.

## What it does

1. Collects per-rig health (git activity, build state, branch count)
2. Snapshots town-wide bead state (open/closed/blocked/convoys)
3. Queries Linear ticket state (velocity, stale items)
4. Checks tracked metrics for staleness
5. Compares to previous refresh, flags notable changes
6. Writes refreshed data to `mayor/pulse/data-refresh.md`
7. Mails Mayor only if notable changes detected

## Dispatch

```bash
gt dog dispatch --formula mol-dog-pulse-refresh
```

## Output

- **`mayor/pulse/data-refresh.md`** — always updated
- **Mail to Mayor** — only if notable changes detected
- **Run wisp** — always recorded

## Silence principle

If nothing notable changed (normal fluctuation, routine activity), the dog
records a run wisp and returns to kennel without mailing. Data file still
gets updated for the next human pulse session.
