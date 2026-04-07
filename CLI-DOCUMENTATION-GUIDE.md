# Best Practices for CLI Documentation

This guide covers modern best practices for documenting CLI tools effectively.

## 1. Built-in Help (Essential)

### Help Flags
Every command should support `-h`, `--help`:
```bash
gt-docker --help
gt-docker up --help
```

**Implementation Tips:**
- Show usage synopsis at the top
- Group commands by category
- Include examples for common tasks
- Keep it scannable with clear formatting

**Example Structure:**
```
TOOL_NAME - brief one-liner

USAGE:
  tool [FLAGS] <command> [ARGS]

COMMANDS:
  Instance Management:
    up <name>        Create and start an instance
    down <name>      Stop instance (keeps data)
    destroy <name>   Delete instance and data

  Access:
    shell <name>     Open shell in container
    mayor <name>     Attach to Mayor session

FLAGS:
  -h, --help       Show this help
  -v, --version    Show version

EXAMPLES:
  tool up myproject
  tool shell myproject
```

### Man Pages
For serious CLI tools, provide man pages:
```bash
man gt-docker
```

Tools: `pandoc` can convert Markdown to man format.

---

## 2. Interactive Documentation

### Command-line TUIs (Text User Interfaces)
**Tools:**
- **charm/gum** - Build interactive prompts and menus
- **charmbracelet/bubbletea** - Full TUI framework (Go)
- **python-prompt-toolkit** - Rich Python CLI framework

**Example Use Cases:**
- Interactive setup wizard
- Guided first-run experience
- Multi-select menus for options

### Shell Completion
Provide autocomplete for bash/zsh/fish:
```bash
gt-docker completion bash > /usr/local/etc/bash_completion.d/gt-docker
```

**Tools:**
- Built into most CLI frameworks (cobra, click, clap)
- Generate completion scripts automatically

---

## 3. Visual Documentation

### Asciinema (Recommended)
Record terminal sessions as lightweight JSON:
```bash
asciinema rec demo.cast
asciinema play demo.cast
asciinema upload demo.cast
```

**Advantages:**
- Copyable text (unlike GIFs)
- Lightweight (~100KB vs 5MB GIF)
- Self-hostable player
- Embeddable in README

**Embed in README:**
```markdown
[![asciicast](https://asciinema.org/a/XXXXX.svg)](https://asciinema.org/a/XXXXX)
```

### VHS (by Charm)
Write terminal demos as code:
```vhs
Output demo.gif
Set Width 1200
Set Height 600

Type "gt-docker up mytown"
Sleep 2s
Enter
Sleep 3s

Type "gt-docker list"
Enter
```

Run: `vhs demo.vhs` → generates GIF/MP4

**Advantages:**
- Reproducible demos (code-as-documentation)
- Easy to update (edit script, regenerate)
- Version control friendly

### Animated GIFs
Classic option but large file sizes:
- **ttygif** - Convert ttyrec to GIF
- **terminalizer** - Record and render
- **gifski** - Highest quality GIF encoder

---

## 4. Web-based Documentation

### Static Site Generators
**Popular Options:**
- **MkDocs** (Python) - Beautiful docs from Markdown
- **Docusaurus** (React) - Facebook's doc framework
- **VitePress** (Vue) - Modern, fast, great search
- **mdBook** (Rust) - Clean, simple, GitBook-like

**Features to Look For:**
- Built-in search
- Syntax highlighting
- Version selector
- Dark mode
- Copy buttons for code blocks

### API Documentation Tools
For CLIs with structured commands:
- **Docsify** - No build step, markdown-driven
- **GitBook** - Commercial but free tier
- **Read the Docs** - Free hosting for open source

---

## 5. Interactive Playgrounds

### Browser-based Terminals
**Options:**
1. **ttyd** - Share terminal over web (you already have this!)
   ```bash
   ttyd -p 7681 -W /path/to/wrapper.sh
   ```
   
2. **gotty** - Similar to ttyd, written in Go

3. **tmate** - Instant terminal sharing
   ```bash
   tmate  # generates shareable URL
   ```

**Use Case:** Host a read-only demo instance:
```bash
ttyd -p 8080 -W -R gt-docker demo-readonly
```

### GitHub Codespaces / Dev Containers
Let users try your CLI in a browser without installation:

**`.devcontainer/devcontainer.json`:**
```json
{
  "name": "GT Docker Demo",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:latest": {}
  },
  "postCreateCommand": "chmod +x gt-docker && ./gt-docker --help",
  "forwardPorts": [8080, 7681]
}
```

Click "Open in Codespaces" → instant demo environment.

### Web-based Sandboxes
- **Replit** - Full IDE in browser
- **CodeSandbox** - For web-focused CLIs
- **Gitpod** - GitHub integration, free tier

---

## 6. Documentation Structure

### Essential Sections

**README.md** (landing page):
- What it is (one sentence)
- Why it exists
- Quick start (copy-paste commands)
- Link to full docs

**INSTALL.md** or Installation Section:
- Prerequisites
- Platform-specific steps (macOS/Linux/Windows)
- Verification (`tool --version`)
- Troubleshooting common install issues

**USAGE.md** or Getting Started:
- First-run tutorial
- Common workflows
- Real-world examples
- CLI reference (or link to it)

**TROUBLESHOOTING.md**:
- Common errors and fixes
- Debug flags and logs
- How to report bugs
- Platform-specific issues

**ARCHITECTURE.md** (for complex tools):
- How it works internally
- Key concepts
- Component diagram
- Design decisions

**CONTRIBUTING.md**:
- How to add commands
- Testing approach
- Code style
- Release process

### CLI Reference

**Auto-generated vs Manual:**
- Auto-generate from code when possible
- Tools: `cobra/doc` (Go), `click/docs` (Python), `clap/markdown` (Rust)
- Manual only for narrative/conceptual content

**Organization:**
```
commands/
  ├── README.md           (command overview)
  ├── up.md               (gt-docker up)
  ├── down.md
  ├── shell.md
  └── formulas/
      ├── list.md
      ├── sync.md
      └── add.md
```

---

## 7. Discoverability Tools

### Command Hints
Show next steps after actions:
```bash
$ gt-docker up mytown
✓ Instance 'mytown' is running

Next steps:
  1. Authenticate: gt-docker shell mytown → claude login
  2. Start Mayor:  gt-docker mayor mytown
  3. View dashboard: http://mytown.town
```

### Progressive Disclosure
Don't overwhelm with all flags upfront:
```bash
# Basic help
gt-docker up --help

# Advanced options
gt-docker up --help-advanced
```

### Examples in Help
Show common patterns:
```bash
EXAMPLES:
  # Standard setup
  gt-docker up mytown

  # Custom ports and cost tier
  DASHBOARD_PORT=8081 GT_COST_TIER=budget gt-docker up mytown

  # Multiple instances
  gt-docker up alpha && gt-docker up bravo
```

---

## 8. Documentation Maintenance

### Keep It Up-to-Date
- Run examples in CI to ensure they work
- Use `<!-- embedme -->` to embed actual file content
- Version docs alongside code
- Note deprecations prominently

### Changelog
Keep a human-readable changelog:
```markdown
## [1.2.0] - 2024-01-15
### Added
- `gt-docker tier` command for cost tier management
- Plugin settings sync with `gt-docker settings sync`

### Changed
- Dashboard now starts automatically on container boot

### Fixed
- SSH agent forwarding on Linux
```

Follow [Keep a Changelog](https://keepachangelog.com/) format.

---

## 9. Recommended Stack for gastown-docker

Based on your current setup, here's what would work best:

### Immediate Wins
1. ✅ **Built-in help** - Already done (`gt-docker --help`)
2. ✅ **README with examples** - Already solid
3. ✅ **Troubleshooting section** - Just added
4. **Shell completion** - Add this next for better UX

### For Interactive Demo
1. **asciinema** - Lightweight, embeddable recordings
   - Record: `asciinema rec demo.cast`
   - Self-host or upload to asciinema.org
   
2. **ttyd** - You already have it!
   - Could host a public read-only demo instance
   - Users try commands in browser

### For Full Documentation Site
If the project grows:
1. **MkDocs + Material theme** - Beautiful, searchable docs
2. **GitHub Pages** - Free hosting
3. **GitHub Actions** - Auto-deploy on push

**Quick setup:**
```yaml
# mkdocs.yml
site_name: gastown-docker
theme:
  name: material
  features:
    - navigation.instant
    - navigation.sections
    - search.suggest

nav:
  - Home: index.md
  - Installation: install.md
  - Quick Start: quickstart.md
  - Formulas: formulas.md
  - CLI Reference: reference/
  - Troubleshooting: troubleshooting.md
```

### For User Exploration
1. **Dev Container** - Let people try in browser via Codespaces
2. **Shell completion** - Improve discoverability
3. **Better examples** in help text

---

## 10. Anti-patterns to Avoid

❌ **README as only documentation** - Gets unwieldy past 500 lines
❌ **No examples** - Theory without practice is hard to follow
❌ **Outdated screenshots** - Worse than no screenshots
❌ **No search** - For docs sites with >10 pages
❌ **Installation instructions buried** - Should be near the top
❌ **No troubleshooting section** - Users will still ask the same questions
❌ **Assuming knowledge** - Explain concepts, don't just reference them

---

## Resources

### Documentation Tools
- [MkDocs](https://www.mkdocs.org/)
- [Docusaurus](https://docusaurus.io/)
- [VitePress](https://vitepress.dev/)

### Recording/Demo Tools
- [asciinema](https://asciinema.org/)
- [VHS](https://github.com/charmbracelet/vhs)
- [ttyd](https://github.com/tsl0922/ttyd)

### CLI Frameworks (with built-in help generation)
- [Cobra](https://cobra.dev/) (Go)
- [Click](https://click.palletsprojects.com/) (Python)
- [Clap](https://github.com/clap-rs/clap) (Rust)
- [Commander.js](https://github.com/tj/commander.js) (Node)

### Style Guides
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs](https://www.writethedocs.org/)
