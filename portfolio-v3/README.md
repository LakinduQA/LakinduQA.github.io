# Lakindu Portfolio V3

An interactive, terminal-first portfolio for Lakindu De Silva. Visitors can explore verified Markdown content through a guided local agent, then switch into a responsive VS Code-inspired workspace.

## Experience

- Starts with a Codex-inspired portfolio agent and accessible slash-command suggestions.
- Supports `/about`, `/experience`, `/education`, `/skills`, `/tools`, `/projects`, `/writing`, `/resume`, `/contact`, `/ide`, `/theme`, `/help`, and `/clear`.
- Understands bounded questions such as `What experience does Lakindu have?`.
- Offers a VS Code-inspired IDE with Explorer folders, tabs, Markdown editor, chat, terminal panel, and status bar.
- Uses focused Explorer, editor, agent, and terminal views on mobile instead of shrinking desktop panels.
- Fetches featured GitHub metadata at runtime and refreshes Medium articles during deployment.
- Uses curated local content whenever an external source is unavailable.

The terminal is deterministic. It never invokes a shell, runs user code, or sends visitor input to an AI service.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Playwright browser tests are available after installing the Chromium browser:

```bash
npx playwright install chromium
npm run test:e2e
```

## Content updates

- Agent and IDE documents: `src/content/portfolio/**/*.md`
- Document paths, aliases, and Explorer metadata: `src/data/documents.ts`
- Featured project fallback content: `src/data/projects.ts`
- Article fallback content: `src/data/articles.ts`
- Slash commands and bounded question routing: `src/lib/agent.ts`

Do not add facts that have not been verified against Lakindu's current public information.

## Deployment

The GitHub Actions workflow validates the project, generates a current Medium snapshot when possible, builds the static application, and deploys `dist` to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

The scheduled workflow refreshes the Medium snapshot daily. GitHub project metadata is fetched directly in the visitor's browser with a bundled fallback.
