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

## Using a driftpaper background in another app

Driftpaper is the source of truth. Other apps load two things straight from
this public repo through jsDelivr's GitHub CDN. No npm publish is needed.

- **The renderer:** `embed/stipple-background.js`. It's one ES module with no
  dependencies; it only needs WebGL2.
- **A preset:** `presets/<name>.json`. This is a settings snapshot exported
  from the editor.

```html
<canvas id="bg" style="position:fixed; inset:0; width:100%; height:100%; z-index:-1"></canvas>

<script type="module">
  import { fetchStippleSnapshot, mountStippleBackground } from
    "https://cdn.jsdelivr.net/gh/lvnd-design/driftpaper@main/embed/stipple-background.js";

  const snapshot = await fetchStippleSnapshot(
    "https://cdn.jsdelivr.net/gh/lvnd-design/driftpaper@main/presets/hard-pigment.json",
  );
  mountStippleBackground(document.getElementById("bg"), snapshot);
</script>
```

Size the canvas with CSS the same way you'd size a background image. The
renderer follows the canvas's size and pixel ratio every frame.
`mountStippleBackground` returns `{ update(snapshot), dispose() }`. In React,
mount it in a `useEffect` and call `dispose()` in the cleanup.

A working example lives in [examples/background.html](examples/background.html).
Run `npm run dev`, then open `/examples/background.html`.

### Changing a preset everywhere

1. Open the editor and dial in the look.
2. Click **Export**. It downloads a `.json` snapshot named after the preset
   name field. (**PNG** still exports a still image.)
3. Save the file over `presets/<name>.json`, then commit and push to `main`.

Every app that loads `presets/<name>.json` picks up the new look on its next
page load. jsDelivr can cache `@main` files for several hours. To force an
update right away, open the matching purge URL:
`https://purge.jsdelivr.net/gh/lvnd-design/driftpaper@main/presets/<name>.json`.

To freeze an app on a specific version, pin it to a commit or tag instead of
`@main`, for example `.../driftpaper@<commit-sha>/presets/hard-pigment.json`.

### Changing the renderer itself

The settings-to-renderer conversion lives in
`src/effects/stipple-from-paper/render-options.ts`. The editor and the embed
both use it, so they render the same snapshot the same way. If you change
the renderer, shaders, or that file, rebuild the bundle and commit it:

```bash
npm run build:embed
```

## Structure

- `src/pages/StippleFromPaper.tsx`: the editor itself
- `src/effects/stipple-from-paper/`: the document model, presets, the WebGL
  renderer, and `render-options.ts` (the settings-to-renderer conversion)
- `src/embed/stipple-background.ts`: the framework-free mount API, built to
  `embed/stipple-background.js`
- `presets/`: exported snapshots served to other apps
- `src/toolcraft/`: the shared UI/runtime library behind the editor's control
  panel, copied over wholesale from `playground`
