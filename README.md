# OpenRouter Free Models Explorer

A web tool that lists current OpenRouter free models *(paid ones as well, if you want them)*.

It's a local API fetch, so it's really fast and is automatically continually updated.

## Features

- Fetches live models from `https://openrouter.ai/api/v1/models`
- URL state syncing for search, filters, sort, and provider mode (shareable links)
- Inline search and full `Cmd+K / Ctrl+K` command palette
- Power-user filters (provider, modalities, instruct type, parameters, moderation, token thresholds, created range, expiration mode)
- Expandable row details with `Copy JSON`

## Scripts

```bash
bun install
bun run dev
bun run lint
bun run test:run
bun run build
```

## Tech

- Vite + React + TypeScript
- TanStack Query
- cmdk
- Vitest + Testing Library
