# Puzzle Bobble 3D

A browser-based Puzzle Bobble (Bust-a-Move) clone with a custom 3D-rendered look using pure HTML5 Canvas 2D API.

## Play

Open `index.html` in any modern browser. No build step or server required.

```bash
# Optional: serve with a simple HTTP server for optimal audio loading
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

- **Mouse move** — aim the cannon
- **Click** — shoot the bubble
- **R** (on game over) — restart

## Features

- **3D faux-rendering** — metallic cannon, glossy bubbles, volumetric dragons, parallax background, all drawn with Canvas 2D
- **Ceiling drop mechanic** — every N shots without a match, the ceiling drops and the grid shifts down
- **Level progression** — 10 levels with increasing difficulty (fewer shots per drop, fewer colors, faster bubbles, more initial rows)
- **Combo system** — consecutive matches increase your combo counter for bragging rights
- **Screen shake** — dynamic shake on ceiling drops, level ups, and game over
- **Procedural audio** — Web Audio API generated sound effects (pop, shoot, ceiling drop, level up, game over)
- **Retro HUD** — level indicator, remaining shots, combo count, next bubble preview

## Architecture

| File | Role |
|------|------|
| `index.html` | Canvas container + HUD DOM elements |
| `style.css` | Retro-arcade UI styling |
| `script.js` | Game engine: grid, physics, rendering, state management |
| `audio.js` | Web Audio sound manager |

## Difficulty Curve

| Level | Initial Rows | Colors | Shots/Drop | Speed |
|-------|-------------|--------|------------|-------|
| 1 | 4 | 6 | 6 | 10 |
| 2 | 4 | 6 | 5 | 10 |
| 3 | 5 | 5 | 5 | 11 |
| 4 | 5 | 5 | 4 | 11 |
| 5 | 6 | 5 | 4 | 12 |
| 6 | 6 | 4 | 3 | 12 |
| 7 | 7 | 4 | 3 | 12 |
| 8 | 7 | 4 | 3 | 13 |
| 9 | 8 | 3 | 2 | 13 |
| 10 | 8 | 3 | 2 | 14 |

## Tech Notes

- **ES5 compatible** — no modern JS features that break older browsers (`ctx.roundRect` polyfilled)
- **Canvas 2D only** — no WebGL, no frameworks, no dependencies
- **No build step** — open `index.html` and play
- **Tested** with Playwright for rendering and functional validation

## License

MIT
