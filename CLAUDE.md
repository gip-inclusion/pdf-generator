# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express.js service that generates PDFs from URLs or HTML strings using Puppeteer. Deployed to Scalingo via GitHub Actions.

## Core Architecture

### PDF Generation Flows

Two distinct PDF generation paths with separate browser instances:

1. **URL-based generation** (`/print` endpoint → `src/print.js`):
   - Uses singleton browser instance with lazy initialization
   - JavaScript disabled for security
   - Waits for network idle before rendering
   - Default margins: 1cm all sides

2. **HTML-based generation** (`/generate` endpoint → `src/generatePdfFromHtml.js`):
   - Uses shared browser instance initialized at server startup
   - Rate-limited to 1 concurrent request via Bottleneck
   - Request ID tracking for all operations
   - Default margins: 2.5cm top/bottom, 1.5cm left/right

### Key Files

- `src/server.js`: Express app setup, auth middleware, endpoint definitions
- `src/print.js`: URL→PDF with singleton browser pattern
- `src/generatePdfFromHtml.js`: HTML→PDF with concurrency control

## Development Commands

```bash
# Run server
npm start

# Lint and format
npm run format    # Auto-fix with Prettier and ESLint
npm run lint      # Check only
```

## Environment Variables

Required:
- `API_KEY`: Bearer token for Authorization header
- `PORT`: Server listen port

## Code Patterns

### Logging
Use `logWithRequestId(requestId, message, error?)` for `/generate` endpoint operations to track request flow.

### Margin Options
Both endpoints accept margin parameters. Extract with `getMarginOptions(queryParams)` which returns object with `top`, `right`, `bottom`, `left` properties.

### Temporary Files
Use `tmp.fileSync({ suffix: ".pdf" })` and always call `tmpFile.removeCallback()` in download callback or finally block.

## Deployment

Auto-deploys to Scalingo on push to `main` via `.github/workflows/deploy-to-scalingo.yml`.

Required GitHub secrets/variables:
- `SCALINGO_API_TOKEN`
- `APP_NAME`
- `REGION`
- `TARGZ_URL`
