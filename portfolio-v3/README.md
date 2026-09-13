# Lakindu Portfolio V3

An interactive, terminal-first portfolio for Lakindu De Silva. Visitors can explore verified Markdown content through a guided local agent, then switch into a responsive VS Code-inspired workspace.

## Experience

- Starts with Assert, a terminal-first portfolio agent with accessible slash-command suggestions.
- Supports commands for every published portfolio topic, plus `/ide`, `/theme`, `/help`, and `/clear`.
- Understands bounded questions such as `What experience does Lakindu have?`.
- Includes selectable display-only model profiles in chat; every profile uses the same deterministic local portfolio engine and sends no prompt to an external AI service.
- Offers a VS Code-inspired IDE with Explorer folders, tabs, Markdown editor, chat, terminal panel, and status bar.
- Uses focused Explorer, editor, agent, and terminal views on mobile instead of shrinking desktop panels.
- Fetches featured GitHub metadata at runtime with a curated local fallback.
- Keeps a deliberately selected article catalog in portfolio Markdown instead of automatically replacing it with the newest Medium posts.

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

- Global identity, role, publication flags, Assert branding, portrait, SEO, and public links: `src/content/portfolio/_config.md`
- Agent and IDE documents: `src/content/portfolio/**/*.md`
- Document paths, aliases, and Explorer metadata: `src/data/documents.ts`
- Project copy and repository links: `src/content/portfolio/work/projects.md`
- Selected article copy, ordering, dates, and Medium links: `src/content/portfolio/writing/articles.md`
- Slash commands and bounded question routing: `src/lib/agent.ts`

The configuration file is a validated Markdown table. Keep its keys unchanged and edit only the values. Each `publish.*` value must be exactly `true` or `false`; the root README is always published. Topic Markdown files can reference configuration values with tokens such as `{{identity.name}}` and `{{contact.medium}}`, and shared documents can use publication blocks such as `{{#if education}}...{{/if}}`. Unknown, duplicate, empty, missing, or invalid configuration values fail the build instead of silently producing stale copy.

The public portrait lives at `public/media/lakindu-de-silva-quality-engineer.jpg`. For a future photo refresh with the same meaning, replace that file with a metadata-stripped high-quality JPEG at the established `1200×1661` dimensions and keep `_config.md` unchanged. Update `portrait.alt` when the accessible description materially changes. If the filename changes, update both `portrait.src` and `seo.image`, and keep the old deployed image available temporarily for search and social-preview caches.

To publish the education section, change `| publish.education | false |` to `| publish.education | true |`, commit, and push. GitHub Actions then rebuilds and publishes the updated static site. Use the same one-line flag change for any other optional section.

Runtime GitHub data may enrich repository URLs, stars, and update dates. Articles are fully curated in `articles.md`; add, remove, or reorder their Markdown sections to change what the portfolio shows.

Do not add facts that have not been verified against Lakindu's current public information.

## Deployment

The GitHub Actions workflow validates the project, builds the static application, and deploys `dist` to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

GitHub project metadata is fetched directly in the visitor's browser with a bundled fallback. Deployments run on pushes to `main` and can also be started manually.
