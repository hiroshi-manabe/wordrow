# Word-Order Trainer

A keyboard-first practice tool that teaches rapid word-order recognition for space-separated languages. This repo contains the new Vite + React + TypeScript client plus the design docs that define the MVP.

## Tech Stack
- React 19 with TypeScript and Vite 7
- ESLint (flat config) + Prettier for linting/formatting
- Node.js >= 20.19.0 (managed locally via `nodebrew`)

## Getting Started
```bash
npm install
npm run dev
```

Additional scripts:
- `npm run build` – type-checks and bundles the production site
- `npm run preview` – serves the production build locally
- `npm run lint` – ESLint with zero-warning enforcement
- `npm run typecheck` – standalone TypeScript compile with `--noEmit`
- `npm run format` – Prettier formatting pass across the repo
- `npm run test` – Vitest unit tests (jsdom environment)

## Documentation
The original design materials live in [`docs/`](docs):
- [`docs/spec.txt`](docs/spec.txt) – v0.6 MVP gameplay/UX spec
- [`docs/high_level_plan.txt`](docs/high_level_plan.txt) – implementation plan and sequencing
- [`docs/README.md`](docs/README.md) – product overview and repository map

These docs stay source-of-truth as we implement the importer, play loop, HUD, persistence, and stat views.

## Next Steps
1. Build the play-route scaffolding: load a text + sentences from Dexie, show context reveal + two-row layout with mocked row data.
2. Implement the deterministic chunk pipeline (4-token groups, shuffle policies, duplicate handling) that will later feed the live keyboard loop.
3. Add HUD/progress placeholders plus snapshot wiring so the Play view can eventually persist session data and drive the Stats screen.
