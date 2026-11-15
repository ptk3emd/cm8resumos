# Impeccable — design agent skills

This static GitHub Pages project includes [Impeccable](https://github.com/pbakaus/impeccable) as a **pinned Git submodule**. It is a development-time design skill for coding agents, not a browser runtime dependency.

## First-time setup

After cloning or pulling this repository, initialize the official upstream source:

```bash
git submodule update --init --recursive
```

The project-local skill directories point to the upstream providers:

| Coding agent | Skill location |
| --- | --- |
| Claude Code | `.claude/skills/impeccable` |
| Codex CLI | `.agents/skills/impeccable` |
| GitHub Copilot | `.github/skills/impeccable` |

These are **relative Git symlinks**, not copies. If your Git client checks them out as plain text instead of symlinks (e.g. some Windows setups), use the official installer locally instead:

```bash
npx impeccable install
```

Run the project's agent command after reloading the coding tool, for example `/impeccable init` in Claude Code or `$impeccable init` in Codex. The official installer is also required if you want to enable automatic design-check hooks; this submodule-based setup intentionally does not install executable hooks.

## GitHub Pages compatibility

The published site remains `index.html` at the repository root. All agent skill files are hidden under dot-directories, so no library, third-party JavaScript, npm package or server is included in the page. No changes to the 970 flashcards are made by this installation.

## Updating

```bash
git -C .vendor/impeccable fetch origin
git -C .vendor/impeccable checkout <reviewed-upstream-commit-sha>
git add .vendor/impeccable
git commit -m "chore: update pinned impeccable version"
```

Review upstream changes before advancing the pinned commit. Impeccable is licensed under Apache-2.0; its license ships with the submodule.
