# Word-Order Trainer MVP

Word-Order Trainer is a keyboard-first practice tool that teaches rapid word-order recognition for space-separated languages (starting with English/German). Players type shuffled token groups using home-row keys as sentences are progressively revealed, training speed and accuracy without leaving the keyboard.

## Current Scope
- Two-row playfield with conveyor “push-up” animation: live top row, queued bottom row, alternating hands.
- Progressive reveal of the full surface sentence while typing normalized candidate tokens (handles casing, punctuation trimming, NFC normalization).
- Duplicate tokens are fungible, mistakes reset the row streak, and input stays enabled during ultra-fast animations.
- Fixed chunk size of four tokens per row (shrinks only for tail fragments) with deterministic shuffle policies.
- Pointer-only UI outside the keyboard controls: only Home and Pause buttons stay clickable during play; Library/Stats screens rely on pointer interactions.
- Strict typography system (global two-line row height, start-aligned text, hyphenation per language, row-wide scale + ellipsis fallback) to keep layout stable.

## Repository Contents
- `spec.txt` — Full v0.6 MVP specification describing gameplay, UX, typography, persistence, and acceptance criteria.
- `high_level_plan.txt` — Technical plan covering stack choices, data modeling, play-loop architecture, and development steps.
- `README.md` — This overview.

## Development Plan
The implementation will follow the phases defined in `high_level_plan.txt`, starting from project scaffolding (React + TypeScript + Vite), IndexedDB schema setup, importer/token normalization, and the core play loop, then layering HUD/progress logic, persistence, Library/Stats UI, typography polish, and automated/manual verification.

## Getting Started
Project scaffolding has not been generated yet. Follow the development plan to initialize the application (e.g., `npm create vite@latest wordrow -- --template react-ts`), then port the spec/plan documents into the app repository and begin implementing the game loop.

## License
TBD.
