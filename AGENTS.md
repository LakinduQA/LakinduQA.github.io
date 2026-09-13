# Portfolio agent instructions

## Scope

- Treat this repository as the complete and current source of truth for the portfolio.
- Work only with files and structure present in this repository.
- Do not read, copy, or import application code, content, styles, dependencies, or configuration from other directories or older checkouts unless the user explicitly asks for it.
- Inspect the current repository before making changes; do not rely on paths or architecture from previous versions.

## Product rules

- Preserve the terminal-first experience and equivalent terminal/IDE navigation.
- Keep verified portfolio facts in `src/content/portfolio/**/*.md`; the terminal, chat, Explorer, and editor must share those documents.
- The command parser must remain deterministic and must never execute shell input or arbitrary code.
- Agent responses must be bounded to registered Markdown topics and must link to the matching IDE file.
- Maintain keyboard access, visible focus, reduced-motion support, semantic HTML, and responsive layouts.
- Mobile IDE mode must use focused Explorer, editor, chat, and terminal surfaces rather than squeezing desktop panels together.
- Keep external data optional and retain curated fallbacks for GitHub and Medium.

## Quality and Git

- Run `npm run check` before commits, plus relevant end-to-end tests when a change affects browser workflows.
- Use focused Conventional Commits.
- Never commit generated builds, caches, dependencies, secrets, or local environment files.
- Do not push, force-push, or alter remotes without explicit user approval.
