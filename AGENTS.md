# Repository Guidelines

## Project Structure & Module Organization

The Express service lives under `src/`. `src/server.js` bootstraps HTTP routing, attaches middleware, and wires Puppeteer for shared browser instances. `src/print.js` orchestrates PDF generation from URLs, while `src/generatePdfFromHtml.js` covers HTML payloads and request-scoped logging helpers. Keep operational assets (e.g., `Aptfile`, deployment configs) at the repository root. Add future automated tests in a dedicated `tests/` or `src/__tests__/` directory so runtime files stay focused.

## Build, Test, and Development Commands

- `npm install` installs dependencies for Node 18 as declared in `package.json`.
- `API_KEY=dev PORT=3000 npm start` launches the local server; verify readiness via `curl http://localhost:3000/ping` and issue `/print?url=...&name=demo.pdf` requests.
- `npm run lint` runs Prettier in check mode, then ESLint using the repo's ignore rules.
- `npm run format` applies formatter fixes; run it before committing if lint alters files.

## Coding Style & Naming Conventions

This codebase treats `.js` files as ES modules; use `import`/`export` and prefer named exports for shared utilities. Prettier enforces two-space indentation, semicolons, and double quotes—avoid manual deviation. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for environment variables, and keep filenames descriptive (`print.js`, not `utils.js`).

## Testing Guidelines

There is no automated test suite yet; manually exercise `/ping` and `/print` after changes. When adding tests, favor high-level integration scenarios that spin up the Express app and drive it with mocked Puppeteer (e.g., via `supertest`). Store fixture HTML in `tests/fixtures/` and name test files `<feature>.test.js`.

## Commit & Pull Request Guidelines

Recent commits use short, present-tense statements (e.g., `make puppeteer navigation timeout a 2.5 seconds instead of 30s`). Follow that tone, keep the first line under 72 characters, and mention Jira/GitHub issue IDs when relevant. Pull requests should describe the problem, the fix, and deployment impact; include sample curl commands, updated environment variables, or screenshots when they help reviewers.

## Security & Configuration Tips

An `.env` file is not committed; supply `API_KEY`, `PORT`, `PAGE_URL_PREFIX`, and optional `PDF_NAME` before running. Keep the API key secret and rotate it when staging credentials change. Puppeteer runs with `--no-sandbox`; ensure hosting environments already sandbox processes or restrict network egress.
