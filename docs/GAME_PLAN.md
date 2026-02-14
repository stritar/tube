# Subway City — Technical plan & roadmap

**Assumptions:**  
- You’re building in the browser only (no native/mobile app at first).  
- “Decent game” = single-player, 2–5 hours of engaging play, no multiplayer.  
- You’re okay learning TypeScript and a game loop; we keep rendering/sim split so you can test logic without the engine.  
- Art will be placeholder (shapes, simple sprites) until you’re ready for an isometric/art pass.

---

## 1. Default stack: engine, UI, language

### Primary engine: **Phaser 3**

**Why Phaser 3**

| Need | How Phaser fits |
|------|------------------|
| Lots of sprites | Sprite batching, texture atlases, object pooling patterns. |
| Animations | Built-in sprite sheets + animation manager; tweens for movement/effects. |
| Camera/zoom | Camera with bounds, zoom, scroll; easy pan/zoom for a city view. |
| Tilemaps | First-class Tiled integration; layers for ground, zoning, decoration. |
| Isometric later | Community plugins (e.g. phaser3-isometric); same scene/game-object model. |
| Performance | WebGL (with Canvas fallback); used for heavy sprite games. |
| Learning curve | Scenes, sprites, tweens, input are documented; many tutorials and examples. |

**Language & tooling: TypeScript**

- Simulation and data structures benefit from types (fewer “why did this break?” moments).  
- Phaser has good TS support and type definitions.  
- Vite for dev server, HMR, and simple build — minimal config, fast feedback.

**UI approach: React overlay (hybrid)**

- **Phaser canvas** = game world only (map, trains, stations, particles).  
- **React** = all menus, HUD, build tool panels, inspectors, modals.  
- Mount a React root in the same HTML page; position a div over the canvas (or beside it).  
- Game → UI: Phaser/scene code emits events or updates a small “game → UI” state (e.g. Zustand or React context); React reads that and renders.  
- UI → game: React calls functions that you expose from the game (e.g. “start build mode”, “place station at x,y”).  

**Why not engine-only UI:** Phaser’s DOM elements and built-in UI are fine for simple text/buttons, but complex, form-heavy, accessible UIs (budgets, line editor, inspector) are much easier in React and match your UX background.

---

### Alternatives (choose only if you have a strong reason)

| Option | Choose this if… |
|--------|------------------|
| **PixiJS** | You want maximum control over render loop and are okay building scenes, input, and camera yourself. Steeper learning curve for a first game. |
| **Kaboom.js** | You want a tiny, fun API and don’t mind a smaller ecosystem and fewer “big game” examples. |
| **Godot (export to web)** | You prefer a full desktop editor and are okay with web as a secondary target; heavier setup and less “web-native” feel. |

**Recommendation:** Start with **Phaser 3 + TypeScript + Vite**, and **React for UI**. Revisit only if you hit a hard ceiling (e.g. performance with thousands of entities).

---

## 2. Phased roadmap: prototype → decent game

### Phase 0: Foundations (≈1–2 weeks)

**Goals:** Run a Phaser scene in the browser; draw something; handle click/drag. Separate “simulation” module that has no Phaser imports.

**Deliverables:**  
- Vite + TS + Phaser “hello world”: one scene, one sprite or shape, click to move it.  
- A separate `sim/` (or `core/`) folder with a simple tick-based state (e.g. a counter) that you can unit-test with Node.  
- You can explain: game loop vs render loop, and what a “tick” is in your sim.

**Success criteria:**  
- `npm run dev` opens the game; a sprite or shape moves or reacts to input.  
- `npm run test` (or similar) runs at least one test that imports sim code and asserts on state after N ticks.

**Common traps:**  
- Putting game logic inside Phaser scene `update()`. Keep sim in pure TS; scene only reads sim state and draws.  
- Learning everything (WebGL, shaders, advanced TS). Ignore those for now; learn only: scene, sprite, input, tween, and how to call your sim from the scene.

**Scope:** ~1–2 weeks part-time.

---

### Phase 1: Tiny playable loop (≈2–3 weeks)

**Goals:** Place stations, draw a line between them, trains move on the line, passengers spawn and get “served,” simple score.

**Deliverables:**  
- Grid or simple map (can be a single tilemap or a plain grid).  
- Build mode: click to place station (node); click two stations to create a line (edge).  
- One or more trains moving along the line (position interpolated between stations).  
- Passengers: spawn at stations with a destination; “board” when train stops; “alight” at destination; count “served” for score.  
- Minimal HUD: served count, maybe money or score.

**Success criteria:**  
- You can place 2–3 stations, connect them, see a train move, see passenger count increase when they’re “served.”  
- No city growth yet; demand can be random or scripted.

**Common traps:**  
- Making trains “real” physics objects. Prefer: train state = (lineId, fromNode, toNode, progress 0–1). Renderer interpolates position.  
- Passenger pathfinding too complex. Start with: “passenger wants A→B; if there’s a path, they wait → board → alight”; use BFS or a simple graph path.

**Scope:** ~2–3 weeks.

---

### Phase 2: City simulation layer (≈3–4 weeks)

**Goals:** City that grows and changes; land use (zones); demand that depends on population/jobs; basic budget.

**Deliverables:**  
- Map divided into districts or cells; each has type (residential, commercial, industrial, etc.) and population/job counts.  
- Growth rules: e.g. zones develop over time; population and jobs generate trip demand (origin–destination matrix or simplified).  
- Budget: income (fares, maybe subsidies), expenses (building, operations); balance or debt.  
- UI: zone view, simple budget panel, maybe a demand heatmap.

**Success criteria:**  
- Building subway lines and stations in busy areas increases ridership and revenue; neglected areas have less demand.  
- You can run the sim for a while and see demand and budget change.

**Common traps:**  
- Over-modeling the economy. Start with 2–3 zone types and simple formulas (e.g. “residential pop × factor = trips”).  
- Coupling city logic to rendering. Keep city state in sim; renderer only visualizes it.

**Scope:** ~3–4 weeks.

---

### Phase 3: Operations realism (≈3–4 weeks)

**Goals:** Schedules, headways, capacity, dwell times, congestion, delays, dispatching.

**Deliverables:**  
- Timetables or headway-based service (e.g. train every 4 min).  
- Dwell time at stations (passengers board/alight; doors “open” for N seconds).  
- Capacity: train has max passengers; excess wait for next train.  
- Delays: random or cascading; affect arrival times and headways.  
- Simple dispatching: hold at terminal, skip station, or emergency stop (can be manual or automatic).

**Success criteria:**  
- Rush hour feels different from off-peak (more trains, more crowding).  
- Delays propagate and affect passenger wait times; player can see the impact.

**Common traps:**  
- Simulating every second. Use a tick-based sim with configurable tick length (e.g. 1 tick = 10 s); convert to real time for display.  
- Making pathfinding too detailed too soon. Keep “passenger chooses route once at origin” then follows it; add transfer logic later if needed.

**Scope:** ~3–4 weeks.

---

### Phase 4: Visuals upgrade (≈2–3 weeks)

**Goals:** Better sprites, more animations, effects, without rewriting simulation.

**Deliverables:**  
- Train sprites (or improved placeholders) with simple animation (e.g. doors, idle).  
- Station activity: people on platform, maybe particles for “boarding.”  
- Signals or indicators where useful.  
- Polish: selection highlights, build preview, smooth camera.

**Success criteria:**  
- Game feels more “alive”; all new art is driven by existing sim state (no duplicate logic).

**Common traps:**  
- Adding rendering logic that duplicates sim state. Rule: sim is source of truth; renderer only displays.  
- Doing isometric in this phase. Treat Phase 4 as 2D polish; isometric is Phase 5.

**Scope:** ~2–3 weeks.

---

### Phase 5: Isometric transition (≈2–4 weeks)

**Goals:** Same game, isometric view; still sprite-based (no 3D engine).

**Plan:**  
- Introduce an isometric coordinate transform: world (x,y) → screen (iso_x, iso_y).  
- Use an isometric tilemap for ground and buildings; keep trains and entities as sprites with correct depth (y-sort).  
- Phaser: use an isometric plugin or custom camera/transform so that (sim_x, sim_y) map to iso screen position.  
- Simulation stays on a 2D grid or graph; only the rendering and art change. No rewrite of sim, routing, or save format.

**Success criteria:**  
- Same mechanics, same save file; only the view and art are isometric.

**Common traps:**  
- Changing sim coordinates to 3D. Keep sim in 2D; transform only at render.  
- Mixing pixel and world units. Define one “sim unit” (e.g. 1 cell) and derive iso position from that.

**Scope:** ~2–4 weeks.

---

### Phase 6: Audio, polish, saves, performance (≈2–4 weeks)

**Goals:** Sound and music, UX polish, save/load, and acceptable performance (including lighter mobile use if you want).

**Deliverables:**  
- Sound effects (train, station, UI) and optional music.  
- Save/load: persist city, lines, trains, budget, time (format ready for future expansion).  
- Performance: object pooling, culling off-screen entities, reduce draw calls where needed.  
- Basic mobile: touch input, responsive UI, maybe reduce particles/effects on small screens.

**Success criteria:**  
- Game can be saved and resumed.  
- Runs smoothly with many trains and passengers; optional mobile playable.

**Scope:** ~2–4 weeks.

---

## 3. Architecture for growth

### Separation of concerns

- **Simulation (`sim/` or `core/`):** Pure TypeScript. No Phaser, no DOM, no React.  
  - Inputs: tick, player actions (place station, add line, etc.).  
  - Outputs: current state (map, lines, trains, passengers, budget, time).  
  - Testable with `npm run test` in Node.

- **Rendering (`game/` or `renderer/`):** Phaser scenes that read sim state and draw.  
  - Each major view can be a scene: Main (city + trains), BuildMode, etc.  
  - Subscribes to sim updates (e.g. every tick or on state change) and updates sprites/positions.

- **UI (`ui/`):** React app for HUD, menus, build panels, inspector.  
  - Reads from the same sim state (or a thin “game state” store that the Phaser side also writes to).  
  - Sends actions (e.g. “place station”, “pause”) into the sim or a game controller.

- **Persistence (`persist/` or inside `sim/`):** Save/load.  
  - Serialize sim state (+ version) to JSON; later you can add compression or binary if needed.  
  - Keep a single “save payload” type so you can version it.

### Data structures (high level)

- **City map:** Grid of cells (or districts). Each cell: type (water, zone type), population, jobs, maybe elevation. Optional: list of “buildings” or landmarks.
- **Networks:** Graph. Nodes = stations (with cell id or x,y). Edges = segments (with length, line id, perhaps capacity). Lines = ordered list of segment ids or node ids.
- **Agents:** Passengers. State: origin, destination, current location (station or train id), phase (waiting / on train / arrived). Optional: desired departure time, route.
- **Vehicles:** Trains. State: line id, current segment or (fromNode, toNode), progress 0–1, capacity, passenger list or count. Optional: schedule offset, delay.
- **Economy:** Budget: balance, income per tick (fares, subsidies), expenses (construction, operations, maintenance). Optional: loans, milestones.

### Game loop and time

- **Sim tick:** Fixed timestep (e.g. 1 tick = 10 sim seconds). Each tick: update city (growth, demand), update trains (move, dwell), update passengers (board, alight, spawn), update budget.
- **Render:** RequestAnimationFrame; Phaser’s default. Interpolate positions for smooth movement (e.g. train position = last tick position + progress × (next - last) based on time since last tick).
- **Pause / speed:** Sim runs at 0, 1×, 2×, etc. (multiply how many ticks you run per real second). Pause = 0 ticks per second.

### Routing / pathfinding

- **Now:** Graph of stations and segments; lines as sequences of stations. Passenger path = BFS or A* on the graph (same line or with transfers if you model them). Store “route” as list of (line, fromStation, toStation) or segment ids.
- **Later:** Transfer times, crowding penalties, frequency-based wait time; still same graph, richer edge costs.

### Events / messaging

- Sim emits events or pushes state to a small “bridge”: e.g. “sim.updated” with a snapshot or diff.  
- Phaser scene and React both subscribe; Phaser updates sprites, React updates HUD/panels.  
- Actions from UI or Phaser (click to place) → call sim API (e.g. `sim.placeStation(x, y)`) → sim updates → next tick or immediate event → UI and Phaser update.

### Saving / loading

- **V1:** One JSON file. Top-level: version, simState (map, lines, trains, passengers, budget, time).  
- **V2:** Same structure, add checksum or schema validation.  
- **Future:** Optional compression (e.g. pako + base64), cloud save (string in backend), or binary format; still keep a single “state” type so migration is one place.

---

## 4. First 2 weeks — concrete plan

### Week 1

**Day 1–2: Repo and “hello Phaser”**  
- Initialize project: `npm create vite@latest . -- --template react-ts` (or vanilla-ts and add React later).  
- Install Phaser: `npm i phaser`.  
- Add a single HTML page with one canvas; boot Phaser with one scene that draws a rectangle or sprite and moves it with the arrow keys or click.  
- Confirm: `npm run dev` and `npm run build` work.

**Day 3: Sim in a box**  
- Create `src/sim/` (or `src/core/`). Add a single state object, e.g. `{ tick: 0, stations: [] }`.  
- Add `tick(state: State): State` that returns a new state (tick + 1).  
- Write a test (Vitest or Jest): after 10 ticks, `state.tick === 10`.  
- No Phaser in this folder.

**Day 4: Connect Phaser to sim**  
- From your Phaser scene, import and call `tick()` on a timer (e.g. every 1 s for now).  
- Draw something from sim state (e.g. number of “stations” or a dot per station).  
- Prove that sim drives what’s on screen.

**Day 5: Grid and one station**  
- Sim: add a grid (e.g. 20×20). Add “place station at (x, y)” to state (list of stations).  
- Phaser: draw the grid (lines or tilemap); draw a circle or sprite at each station.  
- Click on grid → call `sim.placeStation(gridX, gridY)` (convert pixel to grid); refresh state and redraw.

### Week 2

**Day 6: Line between two stations**  
- Sim: add `lines` — each line is an array of station ids or (x,y). Add action “add segment between station A and B.”  
- Draw lines (Phaser graphics or sprites) between consecutive stations of each line.

**Day 7: Train on the line**  
- Sim: add `trains` — each has lineId, segmentIndex, progress in [0,1]. Each tick, increase progress; at 1, move to next segment or wrap.  
- Phaser: one sprite per train; position = interpolate between segment start and end using progress.  
- You should see a train moving along the line.

**Day 8: Passengers (simple)**  
- Sim: add `passengers` — spawn a few at a random station with a random destination. Each tick: if at station and train there and train has space, board; if on train and at destination, alight. Increment “served” count.  
- UI (React or Phaser text): show “Served: N.”

**Day 9: Polish the slice**  
- Build mode toggle: click “Build” → click to place station, click two stations to add segment; “Play” → trains run, passengers spawn.  
- Basic HUD: served count, maybe current mode and time (sim tick).

**Day 10: Ship the vertical slice**  
- Readme: how to run, what the game does (place stations, draw line, train runs, passengers get served).  
- Optional: deploy to Vercel/Netlify (static build).  
- Checklist: place stations ✓, draw line ✓, train moves ✓, passengers spawn and get served ✓, score visible ✓.

### Repo layout (minimal)

```
tube/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts              # or main.tsx if React from start
│   ├── game/
│   │   ├── main-scene.ts     # Phaser scene: grid, stations, lines, trains
│   │   ├── boot.ts           # Phaser config, start MainScene
│   │   └── types.ts          # Phaser-related types
│   ├── sim/
│   │   ├── index.ts          # public API: state, tick(), actions
│   │   ├── state.ts          # State type, initial state
│   │   ├── tick.ts           # tick(state) => new state
│   │   └── actions.ts        # placeStation, addLine, etc.
│   ├── ui/                   # (optional Week 2) React HUD
│   │   ├── App.tsx
│   │   └── components/
│   └── persist/              # (Phase 6) save/load
├── assets/                   # sprites, tiles (later)
├── docs/
│   └── GAME_PLAN.md          # this file
└── tests/
    └── sim/
        └── tick.test.ts
```

### Commands

- `npm run dev` — Vite dev server, open browser.  
- `npm run build` — Production build.  
- `npm run test` — Run sim (and later other) tests.  
- `npm run preview` — Serve production build locally.

### Next-step checklist (first 2 weeks)

- [ ] Node 18+ and npm installed.  
- [ ] Repo cloned; `npm install`.  
- [ ] Phaser scene runs and something moves.  
- [ ] `sim/` exists; `tick()` tested.  
- [ ] Phaser reads from sim state.  
- [ ] Grid + place station on click.  
- [ ] Lines between stations; train moves along line.  
- [ ] Passengers spawn, board, alight; “Served” counter.  
- [ ] Build vs Play mode; minimal HUD.  
- [ ] README and (optional) deploy.

---

## 5. Working like a UX designer building a game

### Prototype the interaction model first

- **Figma (or similar):**  
  - Flows: “Select build tool → click map to place station → click second station to complete segment.”  
  - HUD: where does score, time, budget, tool palette live?  
  - States: playing vs build mode vs paused; what’s available in each?  
- **Diagrams:**  
  - One screen: “transit graph + city grid” and where UI overlays sit.  
  - Simple state machine: Play ↔ Build ↔ Pause; which actions are valid in each.  
- **Paper or clickable mock:** Test “place station, then place line” with someone (or yourself) before coding complex interactions.

### Translating UI into the game

- **HUD:** React components positioned over the canvas (fixed or absolute). Use the same breakpoints/layout principles as product UI; keep touch targets and text size readable.  
- **Build tools:** Toolbar or palette (React) that sets “current tool” (e.g. station, line, demolish). Phaser receives “current tool” and changes cursor and click behavior (e.g. first click = station A, second = station B for segment).  
- **Inspector panels:** Clicking an entity (station, train, line) sets “selected id” in state; React panel reads that id and shows details from sim state (name, ridership, capacity, etc.).  
- **Consistency:** Reuse the same design tokens (colors, spacing, typography) in Figma and in React so the game feels like one product.

### Construction mode UX

- **Clear mode indicator:** Always visible (e.g. “Build” vs “Play”); optional sub-mode (Place station / Draw line / Upgrade / Demolish).  
- **Preview before commit:** When drawing a line, show a ghost or dashed line from first station to cursor; on second click, commit.  
- **Validation feedback:** Invalid placement (e.g. line too long, not enough money) = message or tooltip, don’t silently ignore.  
- **Undo (early):** One-step undo for last placement saves a lot of frustration; implement in sim as “last action” + “revert” and wire a button in UI.

### Scope control

- **Cut early:** Realistic fares, multiple train types, day/night cycle, weather — drop until core loop is fun.  
- **Postpone:** Isometric, sound, localization, multiplayer, mobile polish — plan in roadmap but don’t start until the 2D loop and sim are solid.  
- **Rule:** If a feature doesn’t change “place stations → run trains → serve passengers → earn/grow,” it’s not Phase 1.  
- **UX habit:** Define “minimum lovable” for each phase (e.g. “player can place a line in under 30 seconds without reading docs”); ship that, then add.

---

## Quick reference: stack and commands

| Layer | Choice |
|-------|--------|
| Engine | Phaser 3 |
| Language | TypeScript |
| Build | Vite |
| UI | React (overlay) |
| Test | Vitest (or Jest) |
| Sim | Pure TS in `sim/` |

| Command | Purpose |
|---------|--------|
| `npm run dev` | Run game in dev |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run preview` | Preview production build |

Use this doc as the single source of truth for stack, phases, architecture, and the first 2 weeks. Adjust time estimates to your pace; the order of phases is what matters most.

---

## Your next step (right now)

1. Run `npm run dev` and open the game in the browser.
2. Click **Station**, then click on the grid to place 2–3 stations.
3. Click **Line**, then click one station and then another to draw a line and spawn a train.
4. Click **Play** and watch the train move and the "Served" count increase as passengers are served.
5. Run `npm run test` to confirm the sim tests pass.
6. Open `docs/GAME_PLAN.md` and use the **First 2 weeks** checklist to continue day-by-day.
