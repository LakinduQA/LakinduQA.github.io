# Portfolio V3 agent instructions

## Scope

- Treat this directory as the complete source root for Portfolio V3.
- During development, create and edit application files only inside this directory.
- Files in `D:/lakindu-portfolio/` outside this directory are read-only references for verified personal content.
- Do not import legacy components, styles, dependencies, or build configuration.
- The final release may promote this directory's contents to the repository root and remove the legacy site only because the user explicitly approved that cutover.

## Product rules

- Preserve the terminal-first experience and equivalent terminal/IDE navigation.
- Keep verified portfolio facts in `src/content/portfolio/**/*.md`; the terminal, chat, Explorer, and editor must share those documents.
- The command parser must remain deterministic and must never execute shell input or arbitrary code.
- Agent responses must be bounded to registered Markdown topics and must link to the matching IDE file.
- Maintain keyboard access, visible focus, reduced-motion support, semantic HTML, and responsive layouts.
- Mobile IDE mode must use focused Explorer, editor, chat, and terminal surfaces rather than squeezing desktop panels together.
- Keep external data optional and retain curated fallbacks for GitHub and Medium.

## Quality and Git

- Run type checking, tests, and a production build before commits.
- Use focused Conventional Commits and `v3/`-prefixed milestone branches.
- Never commit generated builds, caches, dependencies, secrets, or local environment files.
- Do not push, force-push, or alter remotes without explicit user approval.
