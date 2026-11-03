import {
  PAPER_CONTROL_DEFAULTS,
  type BackgroundGradient,
  type FormControlValues,
  type PaperReferenceOptions,
  type PaperShape,
  type StippleSettings,
} from "./stipple-renderer.ts";
import type { StippleDocument } from "./document.ts";

/**
 * Converts the editor's plain, serializable settings + document into the
 * options object the WebGL renderer draws from. This is the single source
 * of truth for that conversion — both the editor (StippleFromPaper.tsx) and
 * the standalone embed (src/embed/stipple-background.ts) import it, so a
 * saved snapshot always renders identically in both places.
 */

export const FORM_CONTROL_SCHEMA = "semantic-form-controls-v2";
export const FORM_CONTROL_VERSION = 4;

export type FormControlId = "a" | "b" | "c" | "d" | "e" | "f";
export type FormControlDisplay = "count" | "degrees" | "multiplier" | "number";
export type FormControlDefinition = {
  defaultValue: number;
  display?: FormControlDisplay;
  id: FormControlId;
  label: string;
  max: number;
  min: number;
  step: number;
};

const formControl = (
  id: FormControlId,
  label: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  display: FormControlDisplay = "number",
): FormControlDefinition => ({ defaultValue, display, id, label, max, min, step });

// These controls are the authored parameters for each individual formula.
// The values below match the original rendering, so opening a form does not
// alter it until a control is intentionally changed.
export const FORM_CONTROL_DEFINITIONS: Readonly<Record<PaperShape, readonly FormControlDefinition[]>> = {
  0: [],
  1: [
    formControl("a", "Surface ripple", 0, 0.6, 0.01, 0.25, "number"),
    formControl("b", "Wave height", 0.2, 2, 0.01, 1, "multiplier"),
    formControl("c", "Wave speed", 0, 3, 0.01, 1, "multiplier"),
  ],
  2: [
    formControl("a", "Column count", 2, 18, 1, 8, "count"),
    formControl("b", "Row count", 2, 18, 1, 6, "count"),
    formControl("c", "Dot size", 0.12, 0.46, 0.01, 0.24, "number"),
    formControl("d", "Stagger", 0, 0.5, 0.01, 0.18, "number"),
    formControl("e", "Dot drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  3: [
    formControl("a", "Tile noise", 0, 0.3, 0.005, 0.1, "number"),
    formControl("b", "Arc thickness", 0.4, 2, 0.01, 1, "multiplier"),
    formControl("c", "Tile drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  4: [
    formControl("a", "Corner opening", 0.2, 1, 0.01, 0.5, "number"),
    formControl("b", "Corner offset", 0.2, 2, 0.01, 1, "multiplier"),
    formControl("c", "Corner wobble", 0, 3, 0.01, 1, "multiplier"),
  ],
  5: [
    formControl("a", "Ripple contrast", 0, 0.8, 0.01, 0.5, "number"),
    formControl("b", "Ripple steepness", 0.6, 1.8, 0.01, 1.2, "number"),
    formControl("c", "Ripple speed", 0, 5, 0.01, 3, "number"),
  ],
  6: [
    formControl("a", "Blob separation", 0.2, 2, 0.01, 1, "multiplier"),
    formControl("b", "Blob blend", 1, 8, 0.1, 5, "number"),
    formControl("c", "Orbit speed", 0, 4, 0.01, 2, "number"),
  ],
  7: [
    formControl("a", "Light strength", 0, 0.8, 0.01, 0.5, "number"),
    formControl("b", "Light height", 0.1, 2, 0.01, 0.8, "number"),
    formControl("c", "Light orbit", 0, 3, 0.01, 1, "multiplier"),
  ],
  8: [
    formControl("a", "Primary bend", 0, 0.5, 0.01, 0.2, "number"),
    formControl("b", "Secondary bend", 0, 0.3, 0.01, 0.09, "number"),
    formControl("c", "Band drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  9: [
    formControl("a", "Cell wobble", 0, 0.25, 0.005, 0.08, "number"),
    formControl("b", "Basin softness", 0.25, 1.2, 0.01, 0.76, "number"),
    formControl("c", "Wobble speed", 0, 3, 0.01, 1, "multiplier"),
  ],
  10: [
    formControl("a", "Petal count", 2, 12, 1, 5, "count"),
    formControl("b", "Ring contrast", 0, 0.8, 0.01, 0.5, "number"),
    formControl("c", "Bloom drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  11: [
    formControl("a", "Field contrast", 0.1, 1, 0.01, 0.72, "number"),
    formControl("b", "Detail amount", 0, 0.3, 0.01, 0.11, "number"),
    formControl("c", "Flow drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  12: [],
  13: [
    formControl("a", "Terrace contrast", 0, 0.5, 0.01, 0.2, "number"),
    formControl("b", "Shelf bend", 0, 0.5, 0.01, 0.18, "number"),
    formControl("c", "Tide drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  14: [
    formControl("a", "Cross angle", -60, 0, 1, -28.3, "degrees"),
    formControl("b", "Interaction strength", 0, 0.5, 0.01, 0.18, "number"),
    formControl("c", "Current drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  15: [
    formControl("a", "Fold count", 1, 9, 1, 4, "count"),
    formControl("b", "Crease sharpness", 0.2, 1.5, 0.01, 0.6, "number"),
    formControl("c", "Crease contrast", 0, 0.7, 0.01, 0.33, "number"),
    formControl("d", "Fold drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  16: [
    formControl("a", "Curtain sway", 0, 0.5, 0.01, 0.23, "number"),
    formControl("b", "Strand contrast", 0, 0.5, 0.01, 0.18, "number"),
    formControl("c", "Aurora drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  17: [
    formControl("a", "Spiral tightness", 2, 28, 0.1, 18, "number"),
    formControl("b", "Core size", 0.4, 1.8, 0.01, 1, "multiplier"),
    formControl("c", "Orbit speed", 0, 3, 0.01, 1, "multiplier"),
  ],
  18: [
    formControl("a", "Terrain roughness", 0, 0.45, 0.01, 0.17, "number"),
    formControl("b", "Contour contrast", 0, 0.5, 0.01, 0.25, "number"),
    formControl("c", "Contour drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  19: [
    formControl("a", "Collision strength", 0, 0.5, 0.01, 0.2, "number"),
    formControl("b", "Redirect amount", 0, 0.4, 0.01, 0.15, "number"),
    formControl("c", "Flow speed", 0, 3, 0.01, 1, "multiplier"),
  ],
  20: [
    formControl("a", "Ray count", 3, 24, 1, 10, "count"),
    formControl("b", "Ray curl", 0, 6, 0.01, 2.5, "number"),
    formControl("c", "Fan drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  21: [
    formControl("a", "Track contrast", 0, 0.9, 0.01, 0.68, "number"),
    formControl("b", "Centre openness", 0, 1, 0.01, 0.55, "number"),
    formControl("c", "Orbit speed", 0, 3, 0.01, 0.75, "number"),
  ],
  22: [
    formControl("a", "Ribbon width", 0.05, 0.35, 0.005, 0.18, "number"),
    formControl("b", "Braid height", 0.05, 0.5, 0.01, 0.27, "number"),
    formControl("c", "Ribbon flow", 0, 3, 0.01, 1, "multiplier"),
  ],
  23: [
    formControl("a", "Fault width", 0.05, 0.4, 0.005, 0.22, "number"),
    formControl("b", "Fault contrast", 0, 0.7, 0.01, 0.38, "number"),
    formControl("c", "Fracture drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  24: [
    formControl("a", "Edge width", 0.02, 0.35, 0.005, 0.14, "number"),
    formControl("b", "Warp amount", 0, 0.4, 0.01, 0.18, "number"),
    formControl("c", "Warp drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  25: [
    formControl("a", "Lens size", 0.4, 1.8, 0.01, 1, "multiplier"),
    formControl("b", "Orbit distance", 0, 2, 0.01, 1, "multiplier"),
    formControl("c", "Orbit speed", 0, 5, 0.01, 2.4, "number"),
  ],
  26: [
    formControl("a", "Wash slant", 0.2, 1.5, 0.01, 0.82, "number"),
    formControl("b", "Texture amount", 0, 0.4, 0.01, 0.16, "number"),
    formControl("c", "Wash drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  27: [
    formControl("a", "Horizon level", -0.5, 0.5, 0.01, 0, "number"),
    formControl("b", "Atmosphere depth", 0.2, 1.4, 0.01, 0.7, "number"),
    formControl("c", "Horizon drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  28: [
    formControl("a", "Petal count", 3, 16, 1, 7, "count"),
    formControl("b", "Petal size", 0.4, 1.8, 0.01, 1.15, "number"),
    formControl("c", "Petal drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  29: [
    formControl("a", "Weave count", 1, 8, 1, 4, "count"),
    formControl("b", "Strand width", 0.03, 0.35, 0.005, 0.15, "number"),
    formControl("c", "Weave drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  30: [
    formControl("a", "Head size", 0.15, 0.9, 0.01, 0.48, "number"),
    formControl("b", "Tail length", 0.2, 1.6, 0.01, 0.88, "number"),
    formControl("c", "Tail wave", 0, 0.2, 0.005, 0.075, "number"),
  ],
  31: [
    formControl("a", "Facet count", 3, 18, 1, 8, "count"),
    formControl("b", "Facet contrast", 0, 0.9, 0.01, 0.62, "number"),
    formControl("c", "Facet drift", 0, 3, 0.01, 1, "multiplier"),
  ],
  32: [
    formControl("a", "Pool level", -0.5, 0.5, 0.01, 0, "number"),
    formControl("b", "Sag amount", 0, 0.4, 0.01, 0.17, "number"),
    formControl("c", "Streak contrast", 0, 0.5, 0.01, 0.18, "number"),
  ],
  33: [
    formControl("a", "Core size", 0.12, 0.5, 0.005, 0.255, "number"),
    formControl("b", "Ring width", 0.04, 0.28, 0.005, 0.13, "number"),
    formControl("c", "Ring distortion", 0, 2, 0.01, 1, "multiplier"),
    formControl("d", "Orbit rate", 0, 14, 0.01, 7.5, "number"),
    formControl("e", "Core drift", 0, 0.12, 0.005, 0.035, "number"),
  ],
  34: [
    formControl("a", "Star count", 1, 5, 1, 5, "count"),
    formControl("b", "Trail length", 0.3, 1.8, 0.01, 1.14, "number"),
    formControl("c", "Head size", 0.04, 0.2, 0.005, 0.105, "number"),
    formControl("d", "Star angle", 0, 90, 1, 38.93, "degrees"),
    formControl("e", "Meteor rate", 0, 18, 0.01, 9, "number"),
    formControl("f", "Tail breakup", 0, 0.8, 0.01, 0.32, "number"),
  ],
  35: [
    formControl("a", "Depth", 0.2, 1.2, 0.01, 0.72, "number"),
    formControl("b", "Corner roundness", 0.01, 0.32, 0.005, 0.12, "number"),
    formControl("c", "Tilt", -34, 34, 1, 16, "degrees"),
    formControl("d", "Light direction", -180, 180, 1, -42, "degrees"),
    formControl("e", "Spin speed", 0, 3, 0.01, 0.7, "multiplier"),
  ],
  36: [
    formControl("a", "Point length", 0.2, 1.1, 0.01, 0.65, "number"),
    formControl("b", "Core size", 0.16, 0.42, 0.01, 0.22, "number"),
    formControl("c", "Point sharpness", 1, 6, 0.05, 2.5, "number"),
    formControl("d", "Twinkle amount", 0, 0.22, 0.005, 0.12, "number"),
    formControl("e", "Twinkle speed", 0, 3, 0.01, 0.85, "multiplier"),
  ],
  37: [
    formControl("a", "Horizon", -0.45, 0.35, 0.01, -0.04, "number"),
    formControl("b", "Layer count", 2, 6, 1, 5, "count"),
    formControl("c", "Hill count", 1, 6, 1, 3, "count"),
    formControl("d", "Elevation", 0.08, 0.5, 0.01, 0.28, "number"),
    formControl("e", "Depth", 0.04, 0.3, 0.01, 0.13, "number"),
    formControl("f", "Drift", 0, 3, 0.01, 0.55, "multiplier"),
  ],
  38: [
    formControl("a", "Horizon", -0.28, 0.28, 0.01, -0.09, "number"),
    formControl("b", "Mound height", 0.22, 0.95, 0.01, 0.58, "number"),
    formControl("c", "Field count", 3, 7, 1, 7, "count"),
    formControl("d", "Field slope", 0, 1, 0.01, 0.44, "number"),
    formControl("e", "Atmosphere", 0, 1, 0.01, 0.48, "number"),
    formControl("f", "Drift", 0, 3, 0.01, 0.24, "multiplier"),
  ],
};

export const DEFAULT_LIGHT_DIRECTIONS: Readonly<Partial<Record<PaperShape, { x: number; y: number }>>> = {
  // These preserve the lighting direction already established in each form.
  35: { x: Math.cos(-42 * Math.PI / 180), y: Math.sin(-42 * Math.PI / 180) },
  38: { x: -0.78, y: 0.72 },
};

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clampSignedUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function formControlsFor(settings: StippleSettings, shape: PaperShape): FormControlValues {
  if (settings.formControlSchema !== FORM_CONTROL_SCHEMA || settings.formControlVersion !== FORM_CONTROL_VERSION) {
    return {};
  }
  return settings.formControls?.[String(shape)] ?? {};
}

export function formControlValueFor(
  control: FormControlDefinition,
  savedControls: FormControlValues,
): number {
  const value = savedControls[control.id];
  if (!isFiniteNumber(value)) return control.defaultValue;
  return Math.min(control.max, Math.max(control.min, value));
}

export function formControlValuesFor(
  settings: StippleSettings,
  shape: PaperShape,
): readonly number[] {
  const savedControls = formControlsFor(settings, shape);
  return FORM_CONTROL_DEFINITIONS[shape].map(
    (control) => formControlValueFor(control, savedControls),
  );
}

export function formLightDirectionFor(
  settings: StippleSettings,
  shape: PaperShape,
): { x: number; y: number } {
  const savedControls = formControlsFor(settings, shape);
  const defaultDirection = DEFAULT_LIGHT_DIRECTIONS[shape] ?? { x: -0.78, y: 0.72 };
  const savedX = savedControls.lightX;
  const savedY = savedControls.lightY;
  if (isFiniteNumber(savedX) && isFiniteNumber(savedY)) {
    return { x: clampSignedUnit(savedX), y: clampSignedUnit(savedY) };
  }

  // Soft Cube previously stored its light as a single angle. Convert that
  // value on read so saved scenes retain the same illumination when upgraded.
  if (shape === 35 && isFiniteNumber(savedControls.d)) {
    const angle = savedControls.d * Math.PI / 180;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
  return defaultDirection;
}

export function paperOptionsFor(
  document: StippleDocument,
  settings: StippleSettings,
  width: number,
  height: number,
  paperTime = settings.paperTime,
  paperRotation = settings.paperRotation,
): PaperReferenceOptions {
  const paper = document.layers.find((layer) => layer.kind === "background" && layer.visible);
  const pigments = document.layers
    .filter((layer) => layer.kind === "blob" && layer.visible)
    .map((layer) => layer.color);
  return {
    background: paper?.color ?? "#add5e9",
    backgroundAlpha: settings.outputColorMode === "transparent" ? 0 : paper?.opacity ?? 0,
    backgroundGradient: settings.backgroundGradient as BackgroundGradient | undefined,
    colorMode: settings.outputColorMode === "styled" ? "styled" : "exact",
    colors: pigments.length ? pigments : settings.palette,
    fit: settings.paperFit,
    formControls: formControlValuesFor(settings, settings.paperShape),
    formZoom: settings.formZoom,
    height,
    intensity: settings.intensity,
    noise: settings.grain,
    offsetX: settings.paperOffsetX,
    offsetY: settings.paperOffsetY,
    originX: settings.paperOriginX,
    originY: settings.paperOriginY,
    rotation: paperRotation,
    // Grain size is the single exposed grain-scale control. Keep the legacy
    // field-scale uniform neutral so it cannot duplicate that behavior.
    scale: 1,
    shape: settings.paperShape,
    formBackground: settings.formBackground ?? settings.softCubeBackground ?? PAPER_CONTROL_DEFAULTS.formBackground,
    lightDirection: formLightDirectionFor(settings, settings.paperShape),
    softness: settings.softness,
    time: paperTime,
    width,
    worldHeight: settings.paperWorldHeight,
    worldWidth: settings.paperWorldWidth,
  };
}
