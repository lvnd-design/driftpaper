# driftpaper

A standalone copy of the "Stipple from Paper" visual effect exploration,
ported out of the `playground` repo (`/branded-visual-effects/stipple-from-paper`).

Renders a procedural risograph/stipple effect on top of a "paper" shader,
with a full control panel for zoom, surface ripple, grain, colors, and
export presets.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (defaults to http://localhost:5173).

## Structure

- `src/pages/StippleFromPaper.tsx` — the exploration itself
- `src/effects/stipple-from-paper/` — document model, presets, and the WebGL renderer
- `src/toolcraft/` — the shared UI/runtime library the exploration's control panel is built on, copied over wholesale from `playground`
