# Upcoming Implementation Tasks

These are the next actionable items now that importer normalization is tested and the Play route renders deterministic chunk previews.

## Play Loop Mechanics
- Support duplicate candidate handling plus fungible card matching so any matching label is accepted and the remaining card satisfies subsequent slots.
- Add mistake feedback (visual + streak reset) and pause/resume handling (`Space`, Pause button) that freezes timers and prevents input.
- Animate conveyor push-up: when the live row completes, promote the queued row, spawn the next chunk, and keep the ASDF/JKL; labels stable per row. Keep input hot during the ≤100 ms slide.

## HUD + Progress
- Expand HUD counters to include RPM (EMA + session average) and active time accounting (pause-aware timers).
- Replace the placeholder progress bar with the real row-based bar + tick marks at sentence boundaries. Precompute totals across all sentences.
- Persist pause/home snapshots through the `progress` table so Library → Continue restores identical state, including reveal pointers and HUD.

## Persistence + Stats
- Append minimal session summaries to the `sessions` table on pause/quit, and roll the per-text lifetime aggregates used by `/stats/:textId`.
- Expose Stats view cards (accuracy, RPM, sparkline placeholder) fed by IndexedDB queries.
- Fill Library tiles with derived status (Not started / In progress / Completed) and per-text row progress.

## Testing & Tooling
- Add Vitest suites for chunk order / keyboard handler edge cases.
- Cover Dexie services (progress snapshots and sessions) with deterministic fakes to guard against regression as schema evolves.
