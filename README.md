# Subway City

A browser-based city sim where subways are the core system. Build stations, draw lines, run trains, and serve passengers as the city grows.

## Stack

- **Engine:** Phaser 3  
- **Language:** TypeScript  
- **Build:** Vite  
- **Tests:** Vitest  

See **[docs/GAME_PLAN.md](docs/GAME_PLAN.md)** for the full technical plan, phased roadmap, architecture, and first-2-weeks checklist.

## Quick start

```bash
# Install
npm install

# Run dev server (http://localhost:5173)
npm run dev

# Run tests
npm run test

# Production build
npm run build
npm run preview
```

## Current slice (vertical slice)

- **Place station:** Mode "Station" → click on grid to place a station.
- **Draw line:** Mode "Line" → click one station, then another to create a line and spawn a train.
- **Play:** Mode "Play" → simulation runs; trains move, passengers spawn and get served; "Served" count updates.

## Repo structure

```
src/
  game/       # Phaser scenes and boot
  sim/        # Pure simulation (state, tick, actions) — no engine deps
  main.ts     # Entry point
tests/
  sim/        # Sim unit tests
docs/
  GAME_PLAN.md
```

## Next steps

Follow the **First 2 weeks** section in `docs/GAME_PLAN.md` for day-by-day tasks and the full checklist.
