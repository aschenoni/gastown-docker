# Test Coverage Matrix

Maps every feature in gastown-docker to its test coverage.

## Legend

- **Covered** — Feature has dedicated test cases
- **Partial** — Some aspects tested, gaps noted
- **Gap** — Not yet tested
- **N/A** — Not testable or out of scope

---

## gt-docker CLI

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| Port parsing (ports.conf) | `ports-conf.test.ts` (7) | `port-management.test.ts` (3) | Covered |
| Container naming | `gt-docker-functions.test.ts` (2) | `container-lifecycle.test.ts` (1) | Covered |
| Compose env setup | `gt-docker-functions.test.ts` (2) | — | Covered |
| No-args usage | `gt-docker-dispatch.test.ts` (1) | — | Covered |
| Unknown command error | `gt-docker-dispatch.test.ts` (1) | — | Covered |
| Help flags (-h, --help, help) | `gt-docker-dispatch.test.ts` (3) | — | Covered |
| Missing instance arg (all cmds) | `gt-docker-dispatch.test.ts` (7) | — | Covered |
| Command aliases (start/stop/rm/etc) | `gt-docker-dispatch.test.ts` (5) | — | Covered |
| `up` creates container | — | `container-lifecycle.test.ts` (2) | Covered |
| `down` stops container | — | `container-lifecycle.test.ts` (1) | Covered |
| `destroy` removes volumes | — | `container-lifecycle.test.ts` (1) | Covered |
| `exec` runs as agent user | — | `container-lifecycle.test.ts` (2) | Covered |
| `list` shows instances | — | `container-lifecycle.test.ts` (1) | Covered |
| `mayor` tmux attach | — | — | Gap (interactive) |
| `shell` opens zsh | — | — | Gap (interactive) |
| `logs` streams output | — | — | Gap (interactive) |
| Formulas list | `gt-docker-formulas.test.ts` (5) | — | Covered |
| Formulas add | `gt-docker-formulas.test.ts` (3) | — | Covered |
| Formulas sync | `gt-docker-formulas.test.ts` (1) | `formula-distribution.test.ts` (1) | Covered |
| macOS Docker Desktop PATH | — | — | Gap (env-specific) |
| Symlink resolution | — | — | Gap (low risk) |

## Docker Image (Dockerfile)

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| System packages (17 binaries) | — | `image-build.test.ts` (17) | Covered |
| AWS CLI installed | — | `image-build.test.ts` (1) | Covered |
| Go installed | — | `image-build.test.ts` (1) | Covered |
| Beads (bd) installed | — | `image-build.test.ts` (1) | Covered |
| Dolt installed | — | `image-build.test.ts` (1) | Covered |
| /app and /gt ownership | — | `image-build.test.ts` (2) | Covered |
| PATH configuration | — | `image-build.test.ts` (2) | Covered |
| COLORTERM/TERM env vars | — | `image-build.test.ts` (2) | Covered |
| tmux config (mouse, history, F12) | — | `image-build.test.ts` (3) | Covered |
| Custom formulas baked in | — | `image-build.test.ts` (1) | Covered |
| Custom plugins baked in | — | `image-build.test.ts` (1) | Covered |
| Entrypoint scripts executable | — | `image-build.test.ts` (3) | Covered |
| Multi-arch support (amd64/arm64) | — | — | Gap (CI matrix needed) |

## docker-entrypoint.sh

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| Git config when both vars set | `entrypoint-logic.test.ts` (1) | — | Covered |
| Git config skipped when USER empty | `entrypoint-logic.test.ts` (1) | — | Covered |
| Git config skipped when EMAIL empty | `entrypoint-logic.test.ts` (1) | — | Covered |
| Git config skipped when neither set | `entrypoint-logic.test.ts` (1) | — | Covered |
| Initial install (no town.json) | `entrypoint-logic.test.ts` (1) | — | Covered |
| Refresh install (town.json exists) | `entrypoint-logic.test.ts` (1) | — | Covered |
| Formula copy (new file) | `entrypoint-logic.test.ts` (1) | `formula-distribution.test.ts` (2) | Covered |
| Formula skip (unchanged) | `entrypoint-logic.test.ts` (1) | — | Covered |
| Formula dir missing (skip) | `entrypoint-logic.test.ts` (1) | — | Covered |
| Plugin copy | `entrypoint-logic.test.ts` (1) | `formula-distribution.test.ts` (3) | Covered |
| Dolt start (tolerates failure) | — | — | Partial (tested indirectly) |
| gt up (tolerates failure) | — | — | Partial (tested indirectly) |
| Dashboard on port 8080 | — | `container-lifecycle.test.ts` | Partial |
| ttyd on port 7681 | — | `container-lifecycle.test.ts` | Partial |

## docker-entrypoint-wrapper.sh

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| SSH socket chmod 666 | — | — | Gap (requires socket) |
| Drops to agent user | — | `container-lifecycle.test.ts` (2) | Covered |
| Passes args to entrypoint | — | — | Partial (indirectly tested) |

## docker-compose.yml

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| Container naming pattern | — | `container-lifecycle.test.ts` (1) | Covered |
| Security capabilities | — | — | Gap |
| Volume persistence | — | — | Gap |
| Port mapping (static) | — | `port-management.test.ts` (2) | Covered |
| Port mapping (auto-assign) | — | `port-management.test.ts` (1) | Covered |
| IS_SANDBOX env var | — | — | Gap |
| SSH socket mount | — | — | Gap (requires host socket) |

## PR #2: Settings Management (not yet merged)

| Feature | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| `settings show` command | — | — | Gap (pending merge) |
| `settings sync` command | — | — | Gap (pending merge) |
| `tier` command | — | — | Gap (pending merge) |
| GT_COST_TIER env var | — | — | Gap (pending merge) |
| WEB_PORTS range | — | — | Gap (pending merge) |
| apply-settings.sh | — | — | Gap (pending merge) |
| disabled-plugins.json | — | — | Gap (pending merge) |

---

## Summary

| Category | Covered | Partial | Gap | Total |
|----------|---------|---------|-----|-------|
| gt-docker CLI | 16 | 0 | 4 | 20 |
| Dockerfile | 12 | 0 | 1 | 13 |
| docker-entrypoint.sh | 10 | 3 | 0 | 13 |
| docker-entrypoint-wrapper.sh | 1 | 1 | 1 | 3 |
| docker-compose.yml | 2 | 0 | 4 | 6 |
| PR #2 (pending) | 0 | 0 | 7 | 7 |
| **Total** | **41** | **4** | **17** | **62** |

Gaps are primarily interactive commands (mayor, shell, logs), environment-specific behavior (macOS Docker path, SSH sockets), and security/volume configuration that requires manual verification.
