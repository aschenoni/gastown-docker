# Custom Formulas and Plugins

This repository includes a curated set of formulas and plugins that extend Gas Town with useful workflows and automation.

## What are Formulas?

Formulas are reusable workflow templates that guide the Mayor and workers through multi-step processes. They define the structure of complex tasks — from brainstorming to shipping features.

## What are Plugins?

Plugins are autonomous "dog" agents that run on schedules during Deacon patrol. They monitor project health, perform maintenance tasks, and report issues — but only when something needs attention (silence = healthy).

---

## Included Formulas

### `mol-brainstorm`
**Purpose:** Open-ended brainstorm and feasibility exploration

Use this when you have an idea but aren't ready to write a full spec yet. The Mayor helps you:
- Search for related prior work
- Explore feasibility against the codebase
- Sketch approaches and capture findings
- Produce the right artifact (spec draft, decision record, or research brief)

Each topic gets ONE brainstorm bead that evolves over sessions — no duplicates.

**Usage:** Tell the Mayor "let's brainstorm [topic]" or `gt formula run mol-brainstorm`

---

### `mol-spec-lifecycle`
**Purpose:** Full product lifecycle from spec to shipped feature

The complete workflow for taking a feature from markdown spec through implementation, review, shipping, and documentation. Handles:
- Spec validation and approval
- Implementation planning and execution
- PR creation and review
- Merge and deployment
- Documentation updates
- Metric tracking

**Usage:** `gt formula run mol-spec-lifecycle --spec path/to/spec.md`

---

### `mol-pr-lifecycle`
**Purpose:** Automated PR workflow for a single bead

Streamlined workflow for taking a single bead (task) through:
- Branch creation
- Implementation
- Testing
- PR creation
- Review incorporation
- Merge

Lighter-weight than spec-lifecycle for smaller changes.

**Usage:** `gt formula run mol-pr-lifecycle --bead-id <id>`

---

### `mol-project-pulse`
**Purpose:** Strategic cross-rig project health assessment

Comprehensive project assessment that analyzes:
- Git activity and velocity across all rigs
- Bead state (open/blocked/stale items)
- Linear ticket health
- Build status and test coverage
- Metric trends
- Business alignment

Produces a strategic report for stakeholders.

**Usage:** `gt formula run mol-project-pulse`
**Frequency:** Weekly or before planning meetings

---

### `mol-wrap-up`
**Purpose:** Post-completion cleanup and documentation

Run after shipping a feature to ensure nothing falls through the cracks:
- Update documentation
- Close related beads
- Archive related branches
- Update metrics
- Create retrospective notes

**Usage:** `gt formula run mol-wrap-up --bead-id <id>`

---

## Included Plugins

### `brainstorm-review`
**Purpose:** Triage stale brainstorm beads

Runs weekly to review brainstorm beads that are:
- Parked awaiting research
- Past their `revisit-by` date
- Potentially superseded by recent work

Cross-references with recent specs, closed beads, and merged PRs. Mails the Mayor only if items need triage (close, resume, or extend).

**Cooldown:** 7 days
**Reports:** Only when action needed

---

### `pulse-refresh`
**Purpose:** Keep project pulse data current

Runs weekly to refresh structured project data:
- Per-rig git activity and build state
- Town-wide bead statistics
- Linear ticket velocity and staleness
- Metric freshness

Writes to `mayor/pulse/data-refresh.md` so the quantitative side of project assessment is always current. Mails the Mayor only if notable changes detected.

**Cooldown:** 7 days
**Output:** `mayor/pulse/data-refresh.md`

---

## Dog Formula Variants

The `-dog-` variants (`mol-dog-brainstorm-review`, `mol-dog-pulse-refresh`) are designed for autonomous execution during Deacon patrol. They follow the "silence principle":

- Run automatically on cooldown schedules
- Record a run wisp (audit trail) every time
- Mail the Mayor only when action is needed
- Return to kennel quietly if everything is healthy

Don't invoke these manually — they're registered with the Deacon and run automatically.

---

## Managing Custom Formulas

### View installed formulas
```bash
gt-docker formulas list
```

### Add a new formula
```bash
gt-docker formulas add path/to/custom.formula.toml
```

### Sync to running instances
```bash
gt-docker formulas sync mytown        # one instance
gt-docker formulas sync --all         # all running instances
```

### Inside a container
```bash
gt formula list                       # see all available formulas
gt formula run <name>                 # run a formula
bd formulas find brainstorm           # search for formulas
```

---

## Plugin Settings

Plugins can be disabled to save tokens or reduce noise. Settings are in `settings/disabled-plugins.json`.

### View current settings
```bash
gt-docker settings show
```

### Sync settings to instances
```bash
gt-docker settings sync mytown        # one instance
gt-docker settings sync --all         # all running instances
```

Edit `settings/disabled-plugins.json` to control which plugins run during patrol.

---

## Creating Your Own

### Formula Structure
```toml
[formula]
name = "my-workflow"
description = "What this workflow does"

[[step]]
name = "first-step"
description = "What happens here"
prompt = """
Instructions for the agent...
"""

[[step]]
name = "second-step"
description = "Next action"
prompt = """
More instructions...
"""
```

### Plugin Structure
Plugins are formulas with special frontmatter:

```markdown
+++
name = "my-plugin"
description = "What this plugin does"
version = 1

[gate]
type = "cooldown"
duration = "7d"

[tracking]
labels = ["plugin:my-plugin", "category:hygiene"]
digest = true

[execution]
timeout = "5m"
notify_on_failure = true
severity = "low"
+++

# Plugin Documentation

What it does, when it runs, what it reports...
```

Add formulas to `formulas/` and plugins to `plugins/<plugin-name>/plugin.md`, then sync to your instances.
