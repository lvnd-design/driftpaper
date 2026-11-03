import { lazy, Suspense, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button as ToolcraftButton } from "../toolcraft/ui/components/primitives/button.tsx";
import { PanelSection } from "../toolcraft/ui/components/panel/panel-section.tsx";
import { PanelSurface } from "../toolcraft/ui/components/panel/panel-surface.tsx";
import { SegmentedControl } from "../toolcraft/ui/components/controls/segmented/segmented-control.tsx";
import { SliderControl as ToolcraftSliderControl } from "../toolcraft/ui/components/controls/slider/slider-control.tsx";
import { SwitchControl } from "../toolcraft/ui/components/controls/boolean/boolean-controls.tsx";
import { ToggleGroup, ToggleGroupItem } from "../toolcraft/ui/components/primitives/toggle-group.tsx";

import {
  addBlob,
  type CompositionLayer,
  type StippleDocument,
} from "../effects/stipple-from-paper/document.ts";
import {
  cloneDocument,
  cloneSettings,
  STIPPLE_PRESETS,
  type StipplePresetId,
} from "../effects/stipple-from-paper/presets.ts";
import {
  PAPER_CONTROL_DEFAULTS,
  PAPER_REFERENCE_SHADER_KEY,
  PaperReferenceRenderer,
  type BackgroundGradient,
  type PaperFit,
  type PaperReferenceOptions,
  type PaperShape,
  type FormControlValues,
  type FormBackground,
  type StippleSettings,
} from "../effects/stipple-from-paper/stipple-renderer.ts";
import "./StippleFromPaper.css";

const ToolcraftGradientControl = lazy(async () => {
  const module = await import("../toolcraft/ui/components/controls/gradient/gradient-control.tsx");
  return { default: module.GradientControl };
});

const ToolcraftVectorControl = lazy(async () => {
  const module = await import("../toolcraft/ui/components/controls/vector/vector-control.tsx");
  return { default: module.VectorControl };
});

type InspectorView = "animation" | "shape" | "stipple" | "versions";
type InspectorSection = "controls" | "grain" | "motion" | "surface" | "surge" | "type";
type FormCategory = "flow" | "organic" | "pattern" | "graphic";
type FormBrowserCategory = "all" | FormCategory;

type CanvasFormat = {
  height: number;
  id: "landscape" | "square" | "portrait";
  label: string;
  width: number;
};

type PaperDrag = {
  height: number;
  originX: number;
  originY: number;
  pointerId: number;
  startOffsetX: number;
  startOffsetY: number;
  width: number;
};

type PalettePointerDrag = {
  hasMoved: boolean;
  pointerId: number;
  sourceLayerId: string;
  startY: number;
};

type ColorEditorPosition = {
  right: number;
  top: number;
};

type StippleVersion = {
  activeLayerId: string;
  createdAt: number;
  document: StippleDocument;
  id: string;
  kind: "locked" | "saved";
  name: string;
  presetId: StipplePresetId;
  preview?: string;
  settings: StippleSettings;
};

const VERSION_STORAGE_KEY = "stipple-from-paper:versions:v1";
const LOCKED_VERSION_ID = "hard-pigment-locked";
const PAPER_REFERENCE_RENDERER_VERSION = 26;
const FORM_CONTROL_SCHEMA = "semantic-form-controls-v2";
const FORM_CONTROL_VERSION = 4;
const INITIAL_PRESET = STIPPLE_PRESETS[0];
const CANVAS_FORMATS: readonly CanvasFormat[] = [
  { id: "landscape", label: "Landscape", width: 1200, height: 800 },
  { id: "square", label: "Square", width: 1200, height: 1200 },
  { id: "portrait", label: "Portrait", width: 800, height: 1200 },
];
const MAX_PALETTE_COLORS = 7;
const FORM_BACKGROUNDS: readonly { description: string; label: string; value: FormBackground }[] = [
  { description: "Minimal pigment", label: "Quiet", value: "quiet" },
  { description: "Directional color", label: "Gradient", value: "gradient" },
  { description: "Soft horizontal strata", label: "Layers", value: "layers" },
  { description: "Topographic lines", label: "Contour", value: "contour" },
  { description: "Offset light field", label: "Glow", value: "glow" },
  { description: "Long directional current", label: "Flow", value: "flow" },
  { description: "Low-contrast planes", label: "Facets", value: "facets" },
  { description: "Diagonal pigment sweep", label: "Paper wash", value: "wash" },
];
const BACKGROUND_CAPABLE_FORMS = new Set<PaperShape>([
  2, // Dots
  4, // Corners
  6, // Blob
  7, // Sphere
  10, // Bloom
  25, // Lens
  30, // Comet
  33, // Black hole
  34, // Shooting stars
  35, // Soft cube
  36, // AI sparkle
  37, // Rolling hills
]);
const LIGHTING_CAPABLE_FORMS = new Set<PaperShape>([
  35, // Soft cube
  38, // Layered hills
]);
const DEFAULT_LIGHT_DIRECTIONS: Readonly<Partial<Record<PaperShape, { x: number; y: number }>>> = {
  // These preserve the lighting direction already established in each form.
  35: { x: Math.cos(-42 * Math.PI / 180), y: Math.sin(-42 * Math.PI / 180) },
  38: { x: -0.78, y: 0.72 },
};
const ROLLING_HILLS_REFERENCE_COLORS = {
  background: "#add5e9",
  pigments: ["#ef9fb2", "#2f8b63", "#f2c51a", "#c5add5"],
} as const;
const LAYERED_HILLS_REFERENCE_COLORS = {
  background: "#83b0d4",
  pigments: ["#efa5b6", "#1e6a4b", "#5b9b7d", "#f39a75", "#f2743d", "#f3c51b", "#c6acd2"],
} as const;
type ColorPreset = {
  background: string;
  colors: readonly string[];
  label: string;
};

const COLOR_PRESETS: readonly ColorPreset[] = [
  { background: "#add5e9", colors: ["#1676ee", "#f3bc18", "#9361ef", "#fb75ad"], label: "Paper" },
  { background: ROLLING_HILLS_REFERENCE_COLORS.background, colors: ROLLING_HILLS_REFERENCE_COLORS.pigments, label: "Landscape reference" },
  { background: LAYERED_HILLS_REFERENCE_COLORS.background, colors: LAYERED_HILLS_REFERENCE_COLORS.pigments, label: "Layered terrain" },
  { background: "#f0e8dc", colors: ["#ff6e3f", "#f5c21b", "#d76ea8", "#a68fe7"], label: "Ember" },
  { background: "#dce5dc", colors: ["#087e45", "#00a68a", "#2f50c8", "#f3bc18"], label: "Canopy" },
  { background: "#fff0ec", colors: ["#fdd0ca", "#fc6d76", "#fc815d"], label: "Coral" },
  { background: "#e6efe3", colors: ["#1e4c34", "#02672d", "#4a985c"], label: "Forest" },
  { background: "#f2f0d5", colors: ["#c4c14d", "#4f943b", "#237538"], label: "Meadow" },
  { background: "#f5efc8", colors: ["#a7a41c", "#d2b721", "#f2d140", "#d9a38f"], label: "Harvest" },
  { background: "#f9e8e1", colors: ["#f77c53", "#e17384", "#e6b445", "#f49450", "#e38aa0", "#b24264"], label: "Sunset" },
];

const PAPER_SHAPES: readonly { category: FormCategory | null; label: string; value: PaperShape }[] = [
  { category: "flow", label: "Wave", value: 1 },
  { category: "pattern", label: "Dots", value: 2 },
  { category: "pattern", label: "Truchet", value: 3 },
  { category: "graphic", label: "Corners", value: 4 },
  { category: "flow", label: "Ripple", value: 5 },
  { category: "organic", label: "Blob", value: 6 },
  { category: "organic", label: "Sphere", value: 7 },
  { category: "flow", label: "Bands", value: 8 },
  { category: "pattern", label: "Cells", value: 9 },
  { category: "organic", label: "Bloom", value: 10 },
  { category: "flow", label: "Neutral flow", value: 11 },
  { category: "flow", label: "Tidal shelf", value: 13 },
  { category: "pattern", label: "Interference", value: 14 },
  { category: "flow", label: "Fold", value: 15 },
  { category: "flow", label: "Aurora", value: 16 },
  { category: "organic", label: "Vortex", value: 17 },
  { category: "flow", label: "Topographic", value: 18 },
  { category: "flow", label: "Crosscurrent", value: 19 },
  { category: "graphic", label: "Fan", value: 20 },
  { category: "graphic", label: "Orbit", value: 21 },
  { category: "flow", label: "Ribbon loop", value: 22 },
  { category: "pattern", label: "Fracture", value: 23 },
  { category: "pattern", label: "Soft checker", value: 24 },
  { category: "organic", label: "Lens", value: 25 },
  { category: "flow", label: "Diagonal wash", value: 26 },
  { category: "flow", label: "Horizon", value: 27 },
  { category: "organic", label: "Petal field", value: 28 },
  { category: "pattern", label: "Arc weave", value: 29 },
  { category: "organic", label: "Comet", value: 30 },
  { category: "graphic", label: "Kaleidoscope", value: 31 },
  { category: "organic", label: "Melt", value: 32 },
  { category: "organic", label: "Black hole", value: 33 },
  { category: "organic", label: "Shooting stars", value: 34 },
  { category: "graphic", label: "Soft cube", value: 35 },
  { category: "graphic", label: "AI sparkle", value: 36 },
  { category: "organic", label: "Rolling hills", value: 37 },
  { category: "organic", label: "Layered hills", value: 38 },
];

type FormControlId = "a" | "b" | "c" | "d" | "e" | "f";
type FormControlDisplay = "count" | "degrees" | "multiplier" | "number";
type FormControlDefinition = {
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
const FORM_CONTROL_DEFINITIONS: Readonly<Record<PaperShape, readonly FormControlDefinition[]>> = {
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

function formControlValueLabel(control: FormControlDefinition, value: number): string {
  if (control.display === "count") return `${Math.round(value)}`;
  if (control.display === "degrees") return `${Math.round(value)}°`;
  if (control.display === "multiplier") return value === 0 ? "Still" : `${value.toFixed(2)}×`;
  return value.toFixed(control.step < 1 ? `${control.step}`.split(".")[1]?.length ?? 0 : 0);
}

const FORM_BROWSER_CATEGORIES: readonly { label: string; value: FormBrowserCategory }[] = [
  { label: "All", value: "all" },
  { label: "Flow", value: "flow" },
  { label: "Organic", value: "organic" },
  { label: "Pattern", value: "pattern" },
  { label: "Graphic", value: "graphic" },
];

const PAPER_FITS: readonly { label: string; value: PaperFit }[] = [
  { label: "None", value: "none" },
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
];

const REFERENCE_COLORS: readonly { label: string; value: string }[] = [
  { label: "Paper sky", value: "#add5e9" },
  { label: "Dusk blue", value: "#94a9c8" },
  { label: "Electric blue", value: "#1676ee" },
  { label: "Cobalt", value: "#2f50c8" },
  { label: "Indigo", value: "#3d43ad" },
  { label: "Lemon", value: "#f5dc31" },
  { label: "Gold", value: "#f3bc18" },
  { label: "Tangerine", value: "#ff861b" },
  { label: "Vermilion", value: "#ff5725" },
  { label: "Pink", value: "#fb75ad" },
  { label: "Lilac", value: "#bc85df" },
  { label: "Violet", value: "#9361ef" },
  { label: "Emerald", value: "#087e45" },
  { label: "Pine", value: "#08713d" },
  { label: "Horizon rose", value: "#ef9fb2" },
  { label: "Hill green", value: "#2f8b63" },
  { label: "Field yellow", value: "#f2c51a" },
  { label: "Field lavender", value: "#c5add5" },
  { label: "Pale peach", value: "#fdd0ca" },
  { label: "Coral pink", value: "#fc6d76" },
  { label: "Apricot", value: "#fc815d" },
  { label: "Deep forest", value: "#1e4c34" },
  { label: "Evergreen", value: "#02672d" },
  { label: "Fern", value: "#4a985c" },
  { label: "Moss", value: "#c4c14d" },
  { label: "Meadow green", value: "#4f943b" },
  { label: "Forest green", value: "#237538" },
  { label: "Olive", value: "#a7a41c" },
  { label: "Ochre", value: "#d2b721" },
  { label: "Sunflower", value: "#f2d140" },
  { label: "Clay", value: "#d9a38f" },
  { label: "Warm orange", value: "#f77c53" },
  { label: "Dusty rose", value: "#e17384" },
  { label: "Soft gold", value: "#e6b445" },
  { label: "Amber", value: "#f49450" },
  { label: "Blush", value: "#e38aa0" },
  { label: "Berry", value: "#b24264" },
];

function paletteColorLabel(color: string): string {
  return REFERENCE_COLORS.find((reference) => reference.value.toLowerCase() === color.toLowerCase())?.label
    ?? color.toUpperCase();
}

function paletteLayerLabel(layer: CompositionLayer): string {
  if (layer.kind === "background") return "Background";
  return paletteColorLabel(layer.color);
}

function paletteSelectionLabel(document: StippleDocument): string {
  const background = document.layers.find((layer) => layer.kind === "background")?.color.toLowerCase();
  if (!background) return "Custom";

  const colors = document.layers
    .filter((layer) => layer.kind === "blob")
    .map((layer) => layer.color.toLowerCase())
    .sort();
  const preset = COLOR_PRESETS.find((candidate) => {
    if (candidate.background.toLowerCase() !== background || candidate.colors.length !== colors.length) return false;
    return candidate.colors
      .map((color) => color.toLowerCase())
      .sort()
      .every((color, index) => color === colors[index]);
  });

  return preset?.label ?? "Custom";
}

function formControlValuesFor(
  settings: StippleSettings,
  shape: PaperShape,
): readonly number[] {
  const savedControls = formControlsFor(settings, shape);
  return FORM_CONTROL_DEFINITIONS[shape].map(
    (control) => formControlValueFor(control, savedControls),
  );
}

function formControlsFor(settings: StippleSettings, shape: PaperShape): FormControlValues {
  if (settings.formControlSchema !== FORM_CONTROL_SCHEMA || settings.formControlVersion !== FORM_CONTROL_VERSION) {
    return {};
  }
  return settings.formControls?.[String(shape)] ?? {};
}

function clampSignedUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function formLightDirectionFor(
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

function effectiveBackgroundGradient(
  settings: StippleSettings,
  background: string,
): BackgroundGradient {
  if (settings.backgroundGradient) return settings.backgroundGradient;
  return {
    angle: 90,
    stops: [
      { color: background, opacity: 100, position: "0%" },
      { color: background, opacity: 100, position: "100%" },
    ],
    type: "linear",
  };
}

function formControlValueFor(
  control: FormControlDefinition,
  savedControls: FormControlValues,
): number {
  const value = savedControls[control.id];
  if (!isFiniteNumber(value)) return control.defaultValue;
  return Math.min(control.max, Math.max(control.min, value));
}

function paperOptionsFor(
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
    backgroundGradient: settings.backgroundGradient,
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

function isPresetId(value: unknown): value is StipplePresetId {
  return STIPPLE_PRESETS.some((preset) => preset.id === value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPaperShape(value: unknown): value is PaperShape {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 38;
}

function isPaperFit(value: unknown): value is PaperFit {
  return value === "none" || value === "contain" || value === "cover";
}

function isFormBackground(value: unknown): value is FormBackground {
  return value === "quiet" || value === "gradient" || value === "layers" ||
    value === "contour" || value === "glow" || value === "flow" ||
    value === "facets" || value === "wash";
}

function isBackgroundGradient(value: unknown): value is BackgroundGradient {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const gradient = value as Partial<BackgroundGradient>;
  return isFiniteNumber(gradient.angle) &&
    (gradient.type === "linear" || gradient.type === "radial" || gradient.type === "angular" || gradient.type === "diamond") &&
    Array.isArray(gradient.stops) && gradient.stops.length >= 2 && gradient.stops.length <= 5 &&
    gradient.stops.every((stop) =>
      !!stop && typeof stop.color === "string" && typeof stop.position === "string" &&
      (stop.opacity === undefined || isFiniteNumber(stop.opacity)),
    );
}

function isFormControlValues(value: unknown): value is FormControlValues {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value).every(isFiniteNumber);
}

function isFormControlsByShape(value: unknown): value is Record<string, FormControlValues> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value).every(isFormControlValues);
}

function integrateEaseInOutSine(progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return clampedProgress * 0.5 - Math.sin(Math.PI * clampedProgress) / (Math.PI * 2);
}

function normalizeRotation(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped < -180 ? wrapped + 360 : wrapped;
}

function surgeTravel(
  elapsedSeconds: number,
  peakMultiplier: number,
  rampInSeconds: number,
  holdSeconds: number,
  rampOutSeconds: number,
): number {
  const peak = Math.max(1, peakMultiplier);
  const rampIn = Math.max(0.05, rampInSeconds);
  const rampOut = Math.max(0.05, rampOutSeconds);
  const hold = Math.max(0, holdSeconds);
  const rampInTravel = rampIn * (1 + peak) * 0.5;
  const rampOutTravel = rampOut * (1 + peak) * 0.5;
  const surgeDuration = rampIn + hold + rampOut;
  let travel = 0;
  let remaining = Math.max(0, Math.min(elapsedSeconds, surgeDuration));

  const addRamp = (duration: number, distance: number, isAccelerating: boolean): boolean => {
    if (remaining >= duration) {
      travel += distance;
      remaining -= duration;
      return false;
    }
    const progress = remaining / duration;
    const easedTravel = integrateEaseInOutSine(progress);
    travel += duration * (
      progress + (peak - 1) * (isAccelerating ? easedTravel : progress - easedTravel)
    );
    return true;
  };

  if (addRamp(rampIn, rampInTravel, true)) return travel;
  if (remaining <= hold) return travel + remaining * peak;
  travel += hold * peak;
  remaining -= hold;
  if (addRamp(rampOut, rampOutTravel, false)) return travel;
  return travel;
}

function resizeDocument(
  document: StippleDocument,
  width: number,
  height: number,
): StippleDocument {
  if (document.width === width && document.height === height) return document;
  const horizontalScale = width / document.width;
  const verticalScale = height / document.height;
  return {
    ...document,
    height,
    layers: document.layers.map((layer) => layer.kind === "blob" ? {
      ...layer,
      height: Math.round(layer.height * verticalScale),
      width: Math.round(layer.width * horizontalScale),
      x: Math.round(layer.x * horizontalScale),
      y: Math.round(layer.y * verticalScale),
    } : layer),
    width,
  };
}

function isCompositionLayer(value: unknown): value is CompositionLayer {
  if (!value || typeof value !== "object") return false;
  const layer = value as Partial<CompositionLayer>;
  if (
    typeof layer.id !== "string" || typeof layer.name !== "string" ||
    typeof layer.color !== "string" || typeof layer.visible !== "boolean" ||
    !isFiniteNumber(layer.opacity)
  ) return false;
  if (layer.kind === "background") return true;
  return layer.kind === "blob" &&
    isFiniteNumber(layer.feather) && isFiniteNumber(layer.height) &&
    isFiniteNumber(layer.rotation) && isFiniteNumber(layer.width) &&
    isFiniteNumber(layer.x) && isFiniteNumber(layer.y);
}

function isStippleDocument(value: unknown): value is StippleDocument {
  if (!value || typeof value !== "object") return false;
  const documentValue = value as Partial<StippleDocument>;
  return isFiniteNumber(documentValue.width) && isFiniteNumber(documentValue.height) &&
    Array.isArray(documentValue.layers) && documentValue.layers.length > 0 &&
    documentValue.layers.every(isCompositionLayer);
}

function isStippleSettings(value: unknown): value is StippleSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<StippleSettings> & { paperSurgeRampMs?: unknown };
  return (settings.formZoom === undefined || isFiniteNumber(settings.formZoom)) &&
    isFiniteNumber(settings.intensity) && isFiniteNumber(settings.grain) &&
    isFiniteNumber(settings.softness) && isFiniteNumber(settings.seed) &&
    (settings.paperShape === undefined || isPaperShape(settings.paperShape)) &&
    (settings.formBackground === undefined || isFormBackground(settings.formBackground)) &&
    (settings.backgroundGradient === undefined || isBackgroundGradient(settings.backgroundGradient)) &&
    (settings.softCubeBackground === undefined || isFormBackground(settings.softCubeBackground)) &&
    (settings.outputColorMode === undefined ||
      settings.outputColorMode === "styled" ||
      settings.outputColorMode === "exact" ||
      settings.outputColorMode === "transparent") &&
    (settings.paperMotionSpeed === undefined || isFiniteNumber(settings.paperMotionSpeed)) &&
    (settings.paperSurgeHoldMs === undefined || isFiniteNumber(settings.paperSurgeHoldMs)) &&
    (settings.paperSurgeMultiplier === undefined || isFiniteNumber(settings.paperSurgeMultiplier)) &&
    (settings.paperSurgeRampMs === undefined || isFiniteNumber(settings.paperSurgeRampMs)) &&
    (settings.paperSurgeRampInMs === undefined || isFiniteNumber(settings.paperSurgeRampInMs)) &&
    (settings.paperSurgeRampOutMs === undefined || isFiniteNumber(settings.paperSurgeRampOutMs)) &&
    (settings.paperFit === undefined || isPaperFit(settings.paperFit)) &&
    (settings.paperGrainSize === undefined || isFiniteNumber(settings.paperGrainSize)) &&
    (settings.paperTime === undefined || isFiniteNumber(settings.paperTime)) &&
    (settings.paperRotation === undefined || isFiniteNumber(settings.paperRotation)) &&
    (settings.paperRotationEnabled === undefined || typeof settings.paperRotationEnabled === "boolean") &&
    (settings.paperRotationSpeed === undefined || isFiniteNumber(settings.paperRotationSpeed)) &&
    (settings.paperOffsetX === undefined || isFiniteNumber(settings.paperOffsetX)) &&
    (settings.paperOffsetY === undefined || isFiniteNumber(settings.paperOffsetY)) &&
    (settings.paperOriginX === undefined || isFiniteNumber(settings.paperOriginX)) &&
    (settings.paperOriginY === undefined || isFiniteNumber(settings.paperOriginY)) &&
    (settings.paperWorldWidth === undefined || isFiniteNumber(settings.paperWorldWidth)) &&
    (settings.paperWorldHeight === undefined || isFiniteNumber(settings.paperWorldHeight)) &&
    (settings.formControlSchema === undefined || typeof settings.formControlSchema === "string") &&
    (settings.formControlVersion === undefined || isFiniteNumber(settings.formControlVersion)) &&
    (settings.formControls === undefined || isFormControlsByShape(settings.formControls)) &&
    Array.isArray(settings.palette) && settings.palette.length === 3 &&
    settings.palette.every((color) => typeof color === "string");
}

function createLockedVersion(): StippleVersion {
  const preset = INITIAL_PRESET;
  return {
    activeLayerId: preset.document.layers.find((layer) => layer.kind === "blob")?.id ?? "background",
    createdAt: 0,
    document: cloneDocument(preset.document),
    id: LOCKED_VERSION_ID,
    kind: "locked",
    name: "Hard pigment · locked",
    presetId: preset.id,
    settings: cloneSettings(preset.settings),
  };
}

function isStippleVersion(value: unknown): value is StippleVersion {
  if (!value || typeof value !== "object") return false;
  const version = value as Partial<StippleVersion>;
  return typeof version.id === "string" && typeof version.name === "string" &&
    (version.kind === "locked" || version.kind === "saved") && isFiniteNumber(version.createdAt) &&
    typeof version.activeLayerId === "string" && isPresetId(version.presetId) &&
    isStippleDocument(version.document) && isStippleSettings(version.settings) &&
    (version.preview === undefined || typeof version.preview === "string");
}

function migrateStoredVersion(value: unknown): StippleVersion | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const storedSettings = candidate.settings;
  const migrated = (
    !storedSettings || typeof storedSettings !== "object" ||
    (storedSettings as { interpretation?: unknown }).interpretation !== "paper-native-clean-v3"
  ) ? candidate : {
    ...candidate,
    id: candidate.id === "paper-v31-locked" ? LOCKED_VERSION_ID : candidate.id,
    presetId: INITIAL_PRESET.id,
    settings: Object.fromEntries(
      Object.entries(storedSettings).filter(([key]) => key !== "interpretation"),
    ),
  };
  if (!isStippleVersion(migrated)) return null;
  const { preview: _preview, ...version } = migrated;
  return { ...version, settings: cloneSettings(version.settings) };
}

function readVersions(): StippleVersion[] {
  try {
    const stored = window.localStorage.getItem(VERSION_STORAGE_KEY);
    if (!stored) return [createLockedVersion()];
    const candidate: unknown = JSON.parse(stored);
    if (!Array.isArray(candidate)) return [createLockedVersion()];
    const migrated = candidate
      .map(migrateStoredVersion)
      .filter((version): version is StippleVersion => version !== null);
    const locked = migrated.find((version) => version.id === LOCKED_VERSION_ID) ?? createLockedVersion();
    const saved = migrated.filter((version) => version.id !== LOCKED_VERSION_ID && version.kind === "saved");
    const normalized = [...saved, { ...locked, kind: "locked" as const, name: "Hard pigment · locked" }];
    if (JSON.stringify(candidate) !== JSON.stringify(normalized)) persistVersions(normalized);
    return normalized;
  } catch {
    return [createLockedVersion()];
  }
}

function persistVersions(versions: StippleVersion[]): boolean {
  try {
    window.localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
    return true;
  } catch {
    return false;
  }
}

type SliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (value: number) => void;
};

function Slider({
  id: _id,
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: SliderProps) {
  return (
    <ToolcraftSliderControl
      className="paper-stipple-slider"
      max={max}
      min={min}
      name={label}
      onValueChange={onChange}
      step={step}
      value={value}
      valueLabel={valueLabel}
    />
  );
}

function ProcessedCanvas({
  canvasRef,
  height,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  toolbar,
  width,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  height: number;
  onPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  toolbar: ReactNode;
  width: number;
}) {
  return (
    <article className="paper-stipple-preview">
      <div
        className="paper-stipple-canvas-stage"
        style={{
          width: `min(100%, max(180px, calc((100dvh - 128px) * ${width / height})))`,
        }}
      >
        <div className="paper-stipple-canvas-toolbar">{toolbar}</div>
        <div className="paper-stipple-canvas-wrap" style={{ aspectRatio: `${width} / ${height}` }}>
          <canvas
            aria-label="Hard pigment output. Drag to move the type."
            className="paper-stipple-draggable-canvas"
            onPointerCancel={onPointerCancel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            ref={canvasRef}
          />
        </div>
      </div>
    </article>
  );
}

function StippleFromPaper() {
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentFormPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const formBrowserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const formBrowserRendererRef = useRef<PaperReferenceRenderer | null>(null);
  const formBrowserRef = useRef<HTMLElement>(null);
  const backgroundPickerRef = useRef<HTMLElement>(null);
  const backgroundPickerTriggerRef = useRef<HTMLDivElement>(null);
  const colorPaletteRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const formPreviewCanvasRefs = useRef(new Map<PaperShape, HTMLCanvasElement>());
  const formPreviewCacheRef = useRef(new Map<PaperShape, HTMLCanvasElement>());
  const formPreviewCacheKeyRef = useRef<string | null>(null);
  const formPreviewFrameRef = useRef<number | null>(null);
  const formPreviewGenerationRef = useRef(0);
  const renderFormBrowserPreviewsRef = useRef<() => void>(() => undefined);
  const renderOutputRef = useRef<(paperTime: number, paperRotation?: number) => void>(() => undefined);
  const paperDragRef = useRef<PaperDrag | null>(null);
  const palettePointerDragRef = useRef<PalettePointerDrag | null>(null);
  const paletteColorRowRefs = useRef(new Map<string, HTMLDivElement>());
  const animatedPaperTimeRef = useRef<number | null>(null);
  const animatedPaperRotationRef = useRef<number | null>(null);
  const surgeStartElapsedRef = useRef<number | null>(null);
  const surgeTravelOffsetRef = useRef(0);
  const animationStartedAtRef = useRef<number | null>(null);
  const outputRendererRef = useRef<PaperReferenceRenderer | null>(null);
  const [settings, setSettings] = useState<StippleSettings>(() => cloneSettings(INITIAL_PRESET.settings));
  const hardPigmentInitializedRef = useRef(false);
  const [document, setDocument] = useState<StippleDocument>(() => cloneDocument(INITIAL_PRESET.document));
  const [activeLayerId, setActiveLayerId] = useState("blue");
  const [isColorEditorOpen, setIsColorEditorOpen] = useState(false);
  const [colorEditorPosition, setColorEditorPosition] = useState<ColorEditorPosition | null>(null);
  const [draggedPaletteLayerId, setDraggedPaletteLayerId] = useState<string | null>(null);
  const [paletteDropTargetLayerId, setPaletteDropTargetLayerId] = useState<string | null>(null);
  const versionsRef = useRef<StippleVersion[]>([createLockedVersion()]);
  const versionsLoadedRef = useRef(false);
  const [versions, setVersions] = useState<StippleVersion[]>(() => versionsRef.current);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(LOCKED_VERSION_ID);
  const [versionName, setVersionName] = useState("");
  const [versionMessage, setVersionMessage] = useState<string | null>(null);
  const [inspectorView, setInspectorView] = useState<InspectorView>("stipple");
  const [collapsedInspectorSections, setCollapsedInspectorSections] = useState<Record<InspectorSection, boolean>>({
    type: false,
    controls: false,
    surface: true,
    grain: false,
    motion: false,
    surge: false,
  });
  const [isFormBrowserOpen, setIsFormBrowserOpen] = useState(false);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isCurrentFormPreviewReady, setIsCurrentFormPreviewReady] = useState(false);
  const [formBrowserCategory, setFormBrowserCategory] = useState<FormBrowserCategory>("all");
  const [outputRendererRevision, setOutputRendererRevision] = useState(0);
  const [isSurging, setIsSurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paperSurgeRampInMs = Number.isFinite(settings.paperSurgeRampInMs)
    ? settings.paperSurgeRampInMs
    : PAPER_CONTROL_DEFAULTS.paperSurgeRampInMs;
  const paperSurgeRampOutMs = Number.isFinite(settings.paperSurgeRampOutMs)
    ? settings.paperSurgeRampOutMs
    : PAPER_CONTROL_DEFAULTS.paperSurgeRampOutMs;
  const paperRotationEnabled = settings.paperRotationEnabled === true;
  const paperRotationSpeed = Number.isFinite(settings.paperRotationSpeed)
    ? settings.paperRotationSpeed
    : PAPER_CONTROL_DEFAULTS.paperRotationSpeed;

  const setCurrentFormPreviewCanvas = useCallback((canvas: HTMLCanvasElement | null): void => {
    currentFormPreviewCanvasRef.current = canvas;
    if (canvas) window.requestAnimationFrame(() => renderFormBrowserPreviewsRef.current());
  }, []);

  const replaceVersions = (nextVersions: StippleVersion[]): void => {
    versionsRef.current = nextVersions;
    setVersions(nextVersions);
  };

  const loadVersions = (): StippleVersion[] => {
    if (versionsLoadedRef.current) return versionsRef.current;
    const storedVersions = readVersions();
    versionsLoadedRef.current = true;
    replaceVersions(storedVersions);
    return storedVersions;
  };

  useEffect(() => {
    if (inspectorView === "shape") setInspectorView("stipple");
  }, [inspectorView]);

  useEffect(() => {
    if (inspectorView !== "versions") return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setInspectorView("stipple");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectorView]);

  useEffect(() => {
    const pageClass = "paper-stipple-page";
    window.document.documentElement.classList.add(pageClass);
    window.document.body.classList.add(pageClass);
    return () => {
      window.document.documentElement.classList.remove(pageClass);
      window.document.body.classList.remove(pageClass);
    };
  }, []);

  useEffect(() => {
    if (hardPigmentInitializedRef.current) return;
    hardPigmentInitializedRef.current = true;
    setSettings((current) => current.softness === 0 ? current : { ...current, softness: 0 });
  }, []);

  useEffect(() => {
    // Migrate any in-memory editor state created before Grain field scale was
    // retired. Stored versions receive the same migration through cloneSettings.
    setSettings((current) => cloneSettings(current));
  }, []);

  useEffect(() => {
    setSettings((current) => current.formControlSchema === FORM_CONTROL_SCHEMA && current.formControlVersion === FORM_CONTROL_VERSION
      ? current
      : {
        ...current,
        formControlSchema: FORM_CONTROL_SCHEMA,
        formControlVersion: FORM_CONTROL_VERSION,
        formControls: {},
      });
  }, []);

  useEffect(() => {
    setSettings((current) => {
      const legacySettings = current as StippleSettings & { paperSurgeRampMs?: number };
      const legacyPaperSurgeRampMs = Number.isFinite(legacySettings.paperSurgeRampMs)
        ? legacySettings.paperSurgeRampMs
        : undefined;
      const paperSurgeRampInMs = Number.isFinite(current.paperSurgeRampInMs)
        ? current.paperSurgeRampInMs
        : legacyPaperSurgeRampMs ?? PAPER_CONTROL_DEFAULTS.paperSurgeRampInMs;
      const paperSurgeRampOutMs = Number.isFinite(current.paperSurgeRampOutMs)
        ? current.paperSurgeRampOutMs
        : legacyPaperSurgeRampMs ?? PAPER_CONTROL_DEFAULTS.paperSurgeRampOutMs;
      const paperSurgeHoldMs = Number.isFinite(current.paperSurgeHoldMs)
        ? current.paperSurgeHoldMs
        : PAPER_CONTROL_DEFAULTS.paperSurgeHoldMs;
      const paperRotationEnabled = current.paperRotationEnabled === true;
      const paperRotationSpeed = Number.isFinite(current.paperRotationSpeed)
        ? current.paperRotationSpeed
        : PAPER_CONTROL_DEFAULTS.paperRotationSpeed;
      if (
        current.paperSurgeRampInMs === paperSurgeRampInMs &&
        current.paperSurgeRampOutMs === paperSurgeRampOutMs &&
        current.paperSurgeHoldMs === paperSurgeHoldMs &&
        current.paperRotationEnabled === paperRotationEnabled &&
        current.paperRotationSpeed === paperRotationSpeed
      ) return current;
      return {
        ...current,
        paperRotationEnabled,
        paperRotationSpeed,
        paperSurgeHoldMs,
        paperSurgeRampInMs,
        paperSurgeRampOutMs,
      };
    });
  }, []);

  useEffect(() => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return;
    try {
      const renderer = new PaperReferenceRenderer(canvas, () => {
        setOutputRendererRevision((value) => value + 1);
      });
      outputRendererRef.current = renderer;
      return () => {
        renderer.dispose();
        outputRendererRef.current = null;
      };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The effect renderer is unavailable.");
      return;
    }
  }, [PAPER_REFERENCE_SHADER_KEY, PAPER_REFERENCE_RENDERER_VERSION]);

  useEffect(() => {
    if (outputRendererRevision > 0) setError(null);
  }, [outputRendererRevision]);

  const renderOutput = (paperTime: number, paperRotation = settings.paperRotation): void => {
    const paperRenderer = outputRendererRef.current;
    if (!paperRenderer) return;
    try {
      const options = paperOptionsFor(
        document,
        settings,
        document.width,
        document.height,
        paperTime,
        paperRotation,
      );
      paperRenderer.render({
        ...options,
        grainSize: settings.paperGrainSize,
        height: document.height,
        width: document.width,
      });
      if (error !== null) setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The effect could not be rendered.");
    }
  };
  renderOutputRef.current = renderOutput;

  renderFormBrowserPreviewsRef.current = (): void => {
    const renderer = formBrowserRendererRef.current;
    const previewCanvas = formBrowserCanvasRef.current;
    if (!renderer || !previewCanvas) return;
    const previewWidth = 256;
    const previewHeight = 144;
    const baseOptions = paperOptionsFor(
      document,
      settings,
      previewWidth,
      previewHeight,
      settings.paperTime,
    );

    try {
      const previewCacheKey = JSON.stringify({ document, settings });
      if (formPreviewCacheKeyRef.current !== previewCacheKey) {
        formPreviewCacheKeyRef.current = previewCacheKey;
        formPreviewCacheRef.current.clear();
      }

      const drawInto = (source: HTMLCanvasElement, target: HTMLCanvasElement | null): void => {
        const context = target?.getContext("2d");
        if (!target || !context) return;
        context.clearRect(0, 0, target.width, target.height);
        context.drawImage(source, 0, 0, target.width, target.height);
      };

      const renderInto = (shape: PaperShape, target: HTMLCanvasElement | null): void => {
        const cachedPreview = formPreviewCacheRef.current.get(shape);
        if (cachedPreview) {
          drawInto(cachedPreview, target);
          return;
        }
        renderer.render({
          ...baseOptions,
          fit: "none",
          formControls: formControlValuesFor(settings, shape),
          grainSize: settings.paperGrainSize,
          height: previewHeight,
          lightDirection: formLightDirectionFor(settings, shape),
          offsetX: 0,
          offsetY: 0,
          originX: 0.5,
          rotation: 0,
          scale: 1,
          shape,
          width: previewWidth,
          worldHeight: 0,
          worldWidth: 0,
        });
        const cachedCanvas = window.document.createElement("canvas");
        cachedCanvas.width = previewWidth;
        cachedCanvas.height = previewHeight;
        const cachedContext = cachedCanvas.getContext("2d");
        if (!cachedContext) return;
        cachedContext.drawImage(previewCanvas, 0, 0, previewWidth, previewHeight);
        formPreviewCacheRef.current.set(shape, cachedCanvas);
        drawInto(cachedCanvas, target);
      };

      if (isCurrentFormPreviewReady) {
        renderInto(settings.paperShape, currentFormPreviewCanvasRef.current);
      }

      if (!isFormBrowserOpen) return;
      const shapes = formBrowserCategory === "all"
        ? PAPER_SHAPES
        : PAPER_SHAPES.filter((shape) => shape.category === formBrowserCategory);
      const queuedFrame = formPreviewFrameRef.current;
      if (queuedFrame !== null) window.cancelAnimationFrame(queuedFrame);
      const generation = formPreviewGenerationRef.current + 1;
      formPreviewGenerationRef.current = generation;

      const selectedShape = shapes.find((shape) => shape.value === settings.paperShape);
      const orderedShapes = selectedShape
        ? [selectedShape, ...shapes.filter((shape) => shape.value !== selectedShape.value)]
        : shapes;
      const missingShapes: Array<(typeof PAPER_SHAPES)[number]> = [];
      for (const shape of orderedShapes) {
        const target = formPreviewCanvasRefs.current.get(shape.value) ?? null;
        const cachedPreview = formPreviewCacheRef.current.get(shape.value);
        if (cachedPreview) drawInto(cachedPreview, target);
        else missingShapes.push(shape);
      }

      let index = 0;
      const renderBatch = (): void => {
        if (generation !== formPreviewGenerationRef.current) return;
        const batchEnd = Math.min(index + 2, missingShapes.length);
        while (index < batchEnd) {
          const shape = missingShapes[index];
          renderInto(shape.value, formPreviewCanvasRefs.current.get(shape.value) ?? null);
          index += 1;
        }
        if (index < missingShapes.length) {
          formPreviewFrameRef.current = window.requestAnimationFrame(renderBatch);
        } else {
          formPreviewFrameRef.current = null;
        }
      };

      if (missingShapes.length > 0) {
        formPreviewFrameRef.current = window.requestAnimationFrame(renderBatch);
      }
    } catch {
      // Form previews are nonessential; their renderer must never interrupt the live canvas.
    }
  };

  useEffect(() => () => {
    formPreviewGenerationRef.current += 1;
    if (formPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(formPreviewFrameRef.current);
      formPreviewFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isFormBrowserOpen && !isCurrentFormPreviewReady) return;
    const previewCanvas = window.document.createElement("canvas");
    formBrowserCanvasRef.current = previewCanvas;
    try {
      const renderer = new PaperReferenceRenderer(previewCanvas, () => {
        renderFormBrowserPreviewsRef.current();
      });
      formBrowserRendererRef.current = renderer;
      renderFormBrowserPreviewsRef.current();
      return () => {
        renderer.dispose();
        formBrowserRendererRef.current = null;
        formBrowserCanvasRef.current = null;
      };
    } catch {
      formBrowserCanvasRef.current = null;
      return;
    }
  }, [isCurrentFormPreviewReady, isFormBrowserOpen, PAPER_REFERENCE_SHADER_KEY, PAPER_REFERENCE_RENDERER_VERSION]);

  useEffect(() => {
    if (isCurrentFormPreviewReady || isFormBrowserOpen) return;
    const timeout = window.setTimeout(() => setIsCurrentFormPreviewReady(true), 600);
    return () => window.clearTimeout(timeout);
  }, [isCurrentFormPreviewReady, isFormBrowserOpen]);

  useEffect(() => {
    renderFormBrowserPreviewsRef.current();
  }, [document, formBrowserCategory, isFormBrowserOpen, settings]);

  useEffect(() => {
    if (!isFormBrowserOpen) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsFormBrowserOpen(false);
    };
    const closeOnOutsidePress = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && !formBrowserRef.current?.contains(target)) {
        setIsFormBrowserOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsidePress, true);
    };
  }, [isFormBrowserOpen]);

  useEffect(() => {
    if (!isBackgroundPickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsBackgroundPickerOpen(false);
    };
    const closeOnOutsidePress = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node &&
        !backgroundPickerRef.current?.contains(target) &&
        !backgroundPickerTriggerRef.current?.contains(target)) {
        setIsBackgroundPickerOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsidePress, true);
    };
  }, [isBackgroundPickerOpen]);

  useEffect(() => {
    if (!isColorEditorOpen) return;
    const closeColorEditor = (): void => {
      setIsColorEditorOpen(false);
      setColorEditorPosition(null);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeColorEditor();
    };
    const closeOnOutsidePress = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && !colorPaletteRef.current?.contains(target)) {
        closeColorEditor();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsidePress, true);
    window.addEventListener("scroll", closeColorEditor, true);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsidePress, true);
      window.removeEventListener("scroll", closeColorEditor, true);
    };
  }, [isColorEditorOpen]);

  const updateSetting = <Key extends keyof StippleSettings>(
    key: Key,
    value: StippleSettings[Key],
  ): void => {
    setActiveVersionId(null);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const selectPaperShape = (shape: PaperShape): void => {
    setActiveVersionId(null);
    if (!BACKGROUND_CAPABLE_FORMS.has(shape)) setIsBackgroundPickerOpen(false);
    const appliesLandscapePalette = (shape === 37 || shape === 38) && settings.paperShape !== shape;
    setSettings((current) => ({ ...current, paperShape: shape }));
    if (!appliesLandscapePalette) return;
    const landscapePalette = shape === 38
      ? LAYERED_HILLS_REFERENCE_COLORS
      : ROLLING_HILLS_REFERENCE_COLORS;
    setDocument((current) => {
      let documentWithPaletteSlots = current;
      while (documentWithPaletteSlots.layers.filter((layer) => layer.kind === "blob").length < landscapePalette.pigments.length) {
        documentWithPaletteSlots = addBlob(documentWithPaletteSlots);
      }
      let pigmentIndex = 0;
      return {
        ...documentWithPaletteSlots,
        layers: documentWithPaletteSlots.layers.map((layer) => {
          if (layer.kind === "background") {
            return { ...layer, color: landscapePalette.background };
          }
          const color = landscapePalette.pigments[pigmentIndex] ?? landscapePalette.pigments.at(-1)!;
          pigmentIndex += 1;
          return { ...layer, color, name: paletteColorLabel(color) };
        }),
      };
    });
  };

  const updateCurrentFormControl = (
    key: FormControlId,
    value: number,
  ): void => {
    setActiveVersionId(null);
    setSettings((current) => {
      const shapeKey = String(current.paperShape);
      const currentControls = current.formControlSchema === FORM_CONTROL_SCHEMA && current.formControlVersion === FORM_CONTROL_VERSION
        ? current.formControls?.[shapeKey] ?? {}
        : {};
      const formControls = current.formControlSchema === FORM_CONTROL_SCHEMA && current.formControlVersion === FORM_CONTROL_VERSION
        ? current.formControls
        : {};
      return {
        ...current,
        formControlSchema: FORM_CONTROL_SCHEMA,
        formControlVersion: FORM_CONTROL_VERSION,
        formControls: {
          ...formControls,
          [shapeKey]: { ...currentControls, [key]: value },
        },
      };
    });
  };

  const updateCurrentLightDirection = (value: { x: string; y: string }): void => {
    const x = clampSignedUnit(Number.parseFloat(value.x));
    const y = clampSignedUnit(Number.parseFloat(value.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setActiveVersionId(null);
    setSettings((current) => {
      const shapeKey = String(current.paperShape);
      const currentControls = current.formControlSchema === FORM_CONTROL_SCHEMA && current.formControlVersion === FORM_CONTROL_VERSION
        ? current.formControls?.[shapeKey] ?? {}
        : {};
      const formControls = current.formControlSchema === FORM_CONTROL_SCHEMA && current.formControlVersion === FORM_CONTROL_VERSION
        ? current.formControls
        : {};
      return {
        ...current,
        formControlSchema: FORM_CONTROL_SCHEMA,
        formControlVersion: FORM_CONTROL_VERSION,
        formControls: {
          ...formControls,
          [shapeKey]: { ...currentControls, lightX: x, lightY: y },
        },
      };
    });
  };

  const updateBackgroundGradient = (gradient: BackgroundGradient): void => {
    setActiveVersionId(null);
    setSettings((current) => ({
      ...current,
      backgroundGradient: {
        angle: gradient.angle,
        stops: gradient.stops.map((stop) => ({ ...stop })),
        type: gradient.type,
      },
    }));
  };

  const updateMotionSpeed = (value: number): void => {
    const currentTime = animatedPaperTimeRef.current ?? settings.paperTime;
    const currentRotation = animatedPaperRotationRef.current ?? settings.paperRotation;
    const direction = settings.paperMotionSpeed < 0 ? -1 : 1;
    // Do not make the zero detent a stop button. Crossing it keeps motion
    // continuous at the smallest available rate in the current direction.
    const motionSpeed = Math.abs(value) < 0.01 ? direction * 0.01 : value;
    surgeStartElapsedRef.current = null;
    surgeTravelOffsetRef.current = 0;
    animatedPaperRotationRef.current = null;
    setIsSurging(false);
    setActiveVersionId(null);
    setSettings((current) => ({
      ...current,
      paperMotionSpeed: motionSpeed,
      paperRotation: normalizeRotation(currentRotation),
      paperTime: Number(currentTime.toFixed(3)),
    }));
  };

  useEffect(() => {
    const startedAt = window.performance.now();
    animationStartedAtRef.current = startedAt;
    const startingTime = settings.paperTime;
    const startsWithSurge = surgeStartElapsedRef.current === 0 && isSurging;
    if (!startsWithSurge) {
      surgeStartElapsedRef.current = null;
      surgeTravelOffsetRef.current = 0;
      setIsSurging(false);
    }
    let frame = 0;
    const tick = (now: number): void => {
      const elapsedSeconds = (now - startedAt) / 1000;
      let animationTravel = elapsedSeconds + surgeTravelOffsetRef.current;
      const surgeStartElapsed = surgeStartElapsedRef.current;
      if (surgeStartElapsed !== null) {
        const surgeElapsed = elapsedSeconds - surgeStartElapsed;
        const rampInSeconds = paperSurgeRampInMs / 1000;
        const holdSeconds = settings.paperSurgeHoldMs / 1000;
        const rampOutSeconds = paperSurgeRampOutMs / 1000;
        const surgeDuration = rampInSeconds + holdSeconds + rampOutSeconds;
        const elapsedDuringSurge = Math.max(0, Math.min(surgeElapsed, surgeDuration));
        animationTravel += surgeTravel(
          elapsedDuringSurge,
          settings.paperSurgeMultiplier,
          rampInSeconds,
          holdSeconds,
          rampOutSeconds,
        ) - elapsedDuringSurge;
        if (surgeElapsed >= surgeDuration) {
          surgeTravelOffsetRef.current += surgeTravel(
            surgeDuration,
            settings.paperSurgeMultiplier,
            rampInSeconds,
            holdSeconds,
            rampOutSeconds,
          ) - surgeDuration;
          surgeStartElapsedRef.current = null;
          setIsSurging(false);
        }
      }
      const nextTime = startingTime + animationTravel * settings.paperMotionSpeed;
      const nextRotation = paperRotationEnabled
        ? settings.paperRotation + animationTravel * paperRotationSpeed
        : settings.paperRotation;
      animatedPaperTimeRef.current = nextTime;
      animatedPaperRotationRef.current = nextRotation;
      renderOutputRef.current(nextTime, nextRotation);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [
    settings.paperSurgeHoldMs,
    settings.paperMotionSpeed,
    settings.paperSurgeMultiplier,
    paperSurgeRampInMs,
    paperSurgeRampOutMs,
    paperRotationEnabled,
    paperRotationSpeed,
    settings.paperRotation,
    settings.paperTime,
  ]);

  const triggerSurge = (): void => {
    if (isSurging) return;
    const startedAt = animationStartedAtRef.current;
    surgeStartElapsedRef.current = startedAt === null
      ? 0
      : (window.performance.now() - startedAt) / 1000;
    setIsSurging(true);
  };

  const startPaperDrag = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    paperDragRef.current = {
      height: bounds.height,
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      startOffsetX: settings.paperOffsetX,
      startOffsetY: settings.paperOffsetY,
      width: bounds.width,
    };
    event.preventDefault();
  };

  const movePaperDrag = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const drag = paperDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const clampOffset = (value: number): number => Math.max(-1, Math.min(1, Math.round(value * 100) / 100));
    const nextOffsetX = clampOffset(drag.startOffsetX + (event.clientX - drag.originX) / drag.width);
    const nextOffsetY = clampOffset(drag.startOffsetY + (event.clientY - drag.originY) / drag.height);
    setActiveVersionId(null);
    setSettings((current) =>
      current.paperOffsetX === nextOffsetX && current.paperOffsetY === nextOffsetY
        ? current
        : { ...current, paperOffsetX: nextOffsetX, paperOffsetY: nextOffsetY },
    );
    event.preventDefault();
  };

  const endPaperDrag = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const drag = paperDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    paperDragRef.current = null;
  };

  const commitDocument = (nextDocument: StippleDocument): void => {
    setActiveVersionId(null);
    setDocument(nextDocument);
  };

  const updateCanvasFormat = (format: CanvasFormat): void => {
    commitDocument(resizeDocument(document, format.width, format.height));
  };

  const replaceLayer = (replacement: CompositionLayer): void => {
    commitDocument({
      ...document,
      layers: document.layers.map((layer) => layer.id === replacement.id ? replacement : layer),
    });
  };

  const updatePaletteColor = (layer: CompositionLayer, color: string): void => {
    const matchingReference = REFERENCE_COLORS.find(
      (reference) => reference.value.toLowerCase() === color.toLowerCase(),
    );
    replaceLayer({
      ...layer,
      color,
      name: layer.kind === "blob" ? matchingReference?.label ?? color.toUpperCase() : layer.name,
    });
  };

  const positionColorEditor = (target: HTMLElement): void => {
    const targetBounds = target.getBoundingClientRect();
    const inspectorBounds = inspectorRef.current?.getBoundingClientRect();
    const panelLeft = inspectorBounds?.left ?? targetBounds.left;
    setColorEditorPosition({
      right: Math.max(16, window.innerWidth - panelLeft + 12),
      top: Math.max(16, Math.min(targetBounds.top - 12, window.innerHeight - 272)),
    });
  };

  const openColorEditor = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    setIsFormBrowserOpen(false);
    setIsBackgroundPickerOpen(false);
    positionColorEditor(event.currentTarget);
    setIsColorEditorOpen(true);
  };

  const applyColorPreset = (preset: ColorPreset): void => {
    setActiveVersionId(null);
    setDocument((current) => {
      let documentWithPaletteSlots = current;
      while (documentWithPaletteSlots.layers.filter((layer) => layer.kind === "blob").length < preset.colors.length) {
        documentWithPaletteSlots = addBlob(documentWithPaletteSlots);
      }
      let pigmentIndex = 0;
      const layers: CompositionLayer[] = [];
      documentWithPaletteSlots.layers.forEach((layer) => {
        if (layer.kind === "background") {
          layers.push({ ...layer, color: preset.background ?? layer.color });
          return;
        }
        const color = preset.colors[pigmentIndex];
        pigmentIndex += 1;
        if (color) layers.push({ ...layer, color, name: paletteColorLabel(color) });
      });
      return {
        ...documentWithPaletteSlots,
        layers,
      };
    });
  };

  const updatePigmentColors = (colors: readonly string[]): void => {
    setActiveVersionId(null);
    setDocument((current) => {
      let pigmentIndex = 0;
      return {
        ...current,
        layers: current.layers.map((layer) => {
          if (layer.kind === "background") return layer;
          const color = colors[pigmentIndex] ?? layer.color;
          pigmentIndex += 1;
          return { ...layer, color, name: paletteColorLabel(color) };
        }),
      };
    });
  };

  const updatePaletteColors = (colors: readonly string[]): void => {
    setActiveVersionId(null);
    setDocument((current) => {
      let colorIndex = 0;
      return {
        ...current,
        layers: current.layers.map((layer) => {
          if (layer.kind !== "background" && layer.kind !== "blob") return layer;
          const color = colors[colorIndex] ?? layer.color;
          colorIndex += 1;
          return layer.kind === "blob"
            ? { ...layer, color, name: paletteColorLabel(color) }
            : { ...layer, color };
        }),
      };
    });
  };

  const reversePaletteColors = (): void => {
    const colors = document.layers
      .filter((layer) => layer.kind === "background" || layer.kind === "blob")
      .map((layer) => layer.color)
      .reverse();
    if (colors.length > 1) updatePaletteColors(colors);
  };

  const randomizePaletteColors = (): void => {
    const colors = document.layers
      .filter((layer) => layer.kind === "background" || layer.kind === "blob")
      .map((layer) => layer.color);
    if (colors.length < 2) return;

    const order = colors.map((_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const nextIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[nextIndex]] = [order[nextIndex]!, order[index]!];
    }
    if (order.every((value, index) => value === index)) {
      const first = order.shift();
      if (first !== undefined) order.push(first);
    }
    updatePaletteColors(order.map((index) => colors[index]!));
  };

  const reorderPaletteColors = (sourceLayerId: string, targetLayerId: string): void => {
    if (sourceLayerId === targetLayerId) return;
    const pigmentLayers = document.layers.filter((layer) => layer.kind === "blob");
    const sourceIndex = pigmentLayers.findIndex((layer) => layer.id === sourceLayerId);
    const targetIndex = pigmentLayers.findIndex((layer) => layer.id === targetLayerId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const colors = pigmentLayers.map((layer) => layer.color);
    const [movedColor] = colors.splice(sourceIndex, 1);
    if (!movedColor) return;
    colors.splice(targetIndex, 0, movedColor);
    updatePigmentColors(colors);
  };

  const paletteDropTargetAt = (clientY: number): string | null => {
    const pigmentLayers = document.layers.filter((layer) => layer.kind === "blob");
    for (const layer of pigmentLayers) {
      const bounds = paletteColorRowRefs.current.get(layer.id)?.getBoundingClientRect();
      if (bounds && clientY < bounds.top + bounds.height / 2) return layer.id;
    }
    return pigmentLayers.at(-1)?.id ?? null;
  };

  const clearPalettePointerDrag = (): void => {
    palettePointerDragRef.current = null;
    setDraggedPaletteLayerId(null);
    setPaletteDropTargetLayerId(null);
  };

  const startPalettePointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, layerId: string): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    palettePointerDragRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      sourceLayerId: layerId,
      startY: event.clientY,
    };
    setDraggedPaletteLayerId(layerId);
    setPaletteDropTargetLayerId(null);
  };

  const movePalettePointerDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = palettePointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (!drag.hasMoved) {
      if (Math.abs(event.clientY - drag.startY) < 4) return;
      drag.hasMoved = true;
    }
    setPaletteDropTargetLayerId(paletteDropTargetAt(event.clientY) ?? drag.sourceLayerId);
  };

  const endPalettePointerDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = palettePointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const targetLayerId = drag.hasMoved
      ? paletteDropTargetAt(event.clientY) ?? drag.sourceLayerId
      : drag.sourceLayerId;
    if (targetLayerId !== drag.sourceLayerId) reorderPaletteColors(drag.sourceLayerId, targetLayerId);
    clearPalettePointerDrag();
  };

  const movePaletteColor = (sourceLayerId: string, direction: -1 | 1): void => {
    const pigmentLayers = document.layers.filter((layer) => layer.kind === "blob");
    const sourceIndex = pigmentLayers.findIndex((layer) => layer.id === sourceLayerId);
    const targetLayer = pigmentLayers[sourceIndex + direction];
    if (sourceIndex < 0 || !targetLayer) return;
    reorderPaletteColors(sourceLayerId, targetLayer.id);
  };

  const handlePaletteHandleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    layerId: string,
  ): void => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      movePaletteColor(layerId, -1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      movePaletteColor(layerId, 1);
    }
  };

  const addLayer = (): void => {
    if (document.layers.filter((layer) => layer.kind === "blob").length >= MAX_PALETTE_COLORS) {
      return;
    }
    const nextDocument = addBlob(document);
    const layer = nextDocument.layers.at(-1);
    commitDocument(nextDocument);
    if (layer) {
      setActiveLayerId(layer.id);
      setIsColorEditorOpen(true);
    }
  };

  const deleteLayer = (layer: CompositionLayer): void => {
    if (layer.kind === "background") return;
    commitDocument({ ...document, layers: document.layers.filter((item) => item.id !== layer.id) });
    setActiveLayerId("background");
  };

  const restoreVersion = (version: StippleVersion): void => {
    animatedPaperTimeRef.current = null;
    setDocument(cloneDocument(version.document));
    setSettings(cloneSettings(version.settings));
    setActiveLayerId(version.activeLayerId);
    setActiveVersionId(version.id);
    setVersionMessage(`${version.name} applied.`);
  };

  const saveVersion = (source?: StippleVersion): void => {
    const storedVersions = loadVersions();
    const requestedName = source ? `${source.name} copy` : versionName.trim();
    const savedCount = storedVersions.filter((version) => version.kind === "saved").length;
    const name = requestedName || `Preset ${savedCount + 1}`;
    const snapshot: StippleVersion = source
      ? {
        ...source,
        createdAt: Date.now(),
        document: cloneDocument(source.document),
        id: `version-${Date.now()}`,
        kind: "saved",
        name,
        settings: cloneSettings(source.settings),
      }
      : {
        activeLayerId,
        createdAt: Date.now(),
        document: cloneDocument(document),
        id: `version-${Date.now()}`,
        kind: "saved",
        name,
        presetId: INITIAL_PRESET.id,
        settings: cloneSettings({
          ...settings,
          paperTime: animatedPaperTimeRef.current ?? settings.paperTime,
        }),
      };
    const locked = storedVersions.find((version) => version.id === LOCKED_VERSION_ID) ?? createLockedVersion();
    const nextVersions = [snapshot, ...storedVersions.filter((version) => version.kind === "saved"), locked];
    if (!persistVersions(nextVersions)) {
      setError("This browser could not save the preset.");
      return;
    }
    replaceVersions(nextVersions);
    setActiveVersionId(snapshot.id);
    setVersionName("");
    setVersionMessage(`${name} saved on this device.`);
  };

  const deleteVersion = (version: StippleVersion): void => {
    if (version.kind === "locked") return;
    const nextVersions = versionsRef.current.filter((item) => item.id !== version.id);
    if (!persistVersions(nextVersions)) {
      setError("This browser could not remove the preset.");
      return;
    }
    replaceVersions(nextVersions);
    if (activeVersionId === version.id) {
      setActiveVersionId(null);
    }
    setVersionMessage(`${version.name} removed.`);
  };

  const exportPng = (): void => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("The processed PNG could not be encoded.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = "stipple-from-paper.png";
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const paletteColorCount = document.layers.filter((layer) => layer.kind === "blob").length;
  const orderedVersions = [...versions].sort((first, second) => {
    if (first.kind === second.kind) return second.createdAt - first.createdAt;
    return first.kind === "locked" ? 1 : -1;
  });
  const currentForm = PAPER_SHAPES.find((shape) => shape.value === settings.paperShape) ?? PAPER_SHAPES[0];
  const currentFormControls = FORM_CONTROL_DEFINITIONS[settings.paperShape];
  const visibleFormControls = currentFormControls.filter(
    (control) => !(settings.paperShape === 35 && control.id === "d"),
  );
  const currentFormControlValues = formControlsFor(settings, settings.paperShape);
  const currentLightDirection = formLightDirectionFor(settings, settings.paperShape);
  const currentFormBackground = settings.formBackground ?? settings.softCubeBackground ?? PAPER_CONTROL_DEFAULTS.formBackground;
  const currentFormBackgroundOption = FORM_BACKGROUNDS.find(
    (background) => background.value === currentFormBackground,
  ) ?? FORM_BACKGROUNDS[1];
  const currentBackgroundColor = document.layers.find((layer) => layer.kind === "background")?.color ?? "#add5e9";
  const currentBackgroundGradient = effectiveBackgroundGradient(settings, currentBackgroundColor);
  const currentPaletteLabel = paletteSelectionLabel(document);
  const currentCanvasFormat = CANVAS_FORMATS.find(
    (format) => format.width === document.width && format.height === document.height,
  );
  const formBrowserShapes = formBrowserCategory === "all"
    ? PAPER_SHAPES
    : PAPER_SHAPES.filter((shape) => shape.category === formBrowserCategory);
  const inlinePalette = (
    <div className="paper-stipple-inline-palette" ref={colorPaletteRef}>
      <ToolcraftButton
        aria-expanded={isColorEditorOpen}
        aria-haspopup="dialog"
        aria-label={`Edit colors. Current colors: ${currentPaletteLabel}.`}
        className="paper-stipple-palette-summary"
        onClick={openColorEditor}
        title="Edit colors"
        type="button"
        variant="outline"
      >
        <span aria-hidden="true" className="paper-stipple-palette-summary-colors">
          {document.layers.map((layer) => <span key={layer.id} style={{ background: layer.color }} />)}
        </span>
        <span className="paper-stipple-type-option-label">
          <span>Colors</span>
          <strong>{currentPaletteLabel}</strong>
        </span>
      </ToolcraftButton>
      {isColorEditorOpen ? (
        <div
          aria-label="Color palette"
          className="paper-stipple-inline-palette-editor"
          role="dialog"
          style={colorEditorPosition ?? undefined}
        >
          <section className="paper-stipple-palette-presets" aria-label="Palette presets">
            <span className="paper-stipple-palette-editor-label">Presets</span>
            <div className="paper-stipple-preset-grid">
              {COLOR_PRESETS.map((preset) => (
                <button className="paper-stipple-preset-card" key={preset.label} onClick={() => applyColorPreset(preset)} type="button">
                  <span aria-hidden="true" className="paper-stipple-preset-colors">
                    {[preset.background, ...preset.colors].map((color, index) => <span key={`${preset.label}-${index}`} style={{ background: color }} />)}
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="paper-stipple-palette-custom" aria-label="Custom colors">
            <div className="paper-stipple-palette-custom-header">
              <span className="paper-stipple-palette-editor-label">Custom colors</span>
              <div className="paper-stipple-palette-order-actions">
                <ToolcraftButton
                  aria-label="Reverse color order"
                  className="paper-stipple-palette-icon-button"
                  disabled={paletteColorCount < 1}
                  onClick={reversePaletteColors}
                  size="icon-xs"
                  title="Reverse colors"
                  type="button"
                  variant="ghost"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h10m0 0-2.5-2.5M14 6l-2.5 2.5M16 14H6m0 0 2.5-2.5M6 14l2.5 2.5" /></svg>
                </ToolcraftButton>
                <ToolcraftButton
                  aria-label="Randomize color order"
                  className="paper-stipple-palette-icon-button"
                  disabled={paletteColorCount < 1}
                  onClick={randomizePaletteColors}
                  size="icon-xs"
                  title="Randomize colors"
                  type="button"
                  variant="ghost"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h2c3.5 0 3.5 8 7 8h3m-2-2 2 2-2 2M4 14h2c1.25 0 2.1-1 3.1-2.3M14 4l2 2-2 2" /></svg>
                </ToolcraftButton>
              </div>
            </div>
            <div className="paper-stipple-palette-color-list">
              {document.layers.map((layer) => (
                <div
                  className={`paper-stipple-palette-color-row${draggedPaletteLayerId === layer.id ? " is-dragging" : ""}${paletteDropTargetLayerId === layer.id && draggedPaletteLayerId !== layer.id ? " is-drop-target" : ""}`}
                  key={layer.id}
                  ref={(node) => {
                    if (layer.kind !== "blob") return;
                    if (node) paletteColorRowRefs.current.set(layer.id, node);
                    else paletteColorRowRefs.current.delete(layer.id);
                  }}
                >
                  {layer.kind === "blob" ? (
                    <button
                      aria-label={`Reorder ${paletteLayerLabel(layer)}. Use the up and down arrows to move it with a keyboard.`}
                      className="paper-stipple-palette-drag-handle"
                      onKeyDown={(event) => handlePaletteHandleKeyDown(event, layer.id)}
                      onPointerCancel={clearPalettePointerDrag}
                      onPointerDown={(event) => startPalettePointerDrag(event, layer.id)}
                      onPointerMove={movePalettePointerDrag}
                      onPointerUp={endPalettePointerDrag}
                      title="Drag to reorder"
                      type="button"
                    >
                      ⠿
                    </button>
                  ) : <span aria-hidden="true" className="paper-stipple-palette-drag-spacer" />}
                  <input aria-label={`Choose ${paletteLayerLabel(layer)} color`} onChange={(event) => updatePaletteColor(layer, event.target.value)} title={`Choose ${paletteLayerLabel(layer)} color`} type="color" value={layer.color} />
                  <span>{paletteLayerLabel(layer)}</span>
                  <code>{layer.color.toUpperCase()}</code>
                  {layer.kind === "blob" ? (
                    <ToolcraftButton aria-label={`Remove ${paletteLayerLabel(layer)}`} className="paper-stipple-palette-remove" onClick={() => deleteLayer(layer)} size="icon-xs" title="Remove color" type="button" variant="ghost">×</ToolcraftButton>
                  ) : null}
                </div>
              ))}
            </div>
            <ToolcraftButton className="paper-stipple-palette-add-color" disabled={paletteColorCount >= MAX_PALETTE_COLORS} onClick={addLayer} size="xs" type="button" variant="outline">+ Add color</ToolcraftButton>
          </section>
          <fieldset className="paper-stipple-background-output">
            <legend>Color treatment</legend>
            <SegmentedControl
              ariaLabel="Color treatment"
              name="Color treatment"
              onValueChange={(value) => updateSetting("outputColorMode", value as StippleSettings["outputColorMode"])}
              options={[
                { label: "Styled", value: "styled" },
                { label: "Exact", value: "exact" },
                { label: "Transparent", value: "transparent" },
              ]}
              value={settings.outputColorMode}
            />
          </fieldset>
        </div>
      ) : null}
    </div>
  );

  return (
    <main className="paper-stipple-lab toolcraft-stipple-shell">
      <div className="paper-stipple-shell">
        <section className="paper-stipple-main" aria-label="Effect canvas">
          {error ? <p className="paper-stipple-error" role="alert">{error}</p> : null}

          <div className="paper-stipple-previews">
            <ProcessedCanvas
              canvasRef={processedCanvasRef}
              height={document.height}
              onPointerCancel={endPaperDrag}
              onPointerDown={startPaperDrag}
              onPointerMove={movePaperDrag}
              onPointerUp={endPaperDrag}
              toolbar={(
                <label className="paper-stipple-canvas-format" htmlFor="canvas-format">
                  <select
                    aria-label="Orientation"
                    id="canvas-format"
                    onChange={(event) => {
                      const format = CANVAS_FORMATS.find((item) => item.id === event.target.value);
                      if (format) updateCanvasFormat(format);
                    }}
                    value={currentCanvasFormat?.id ?? "custom"}
                  >
                    {currentCanvasFormat ? null : (
                      <option disabled value="custom">Custom · {document.width} × {document.height}</option>
                    )}
                    {CANVAS_FORMATS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label} · {format.width} × {format.height}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              width={document.width}
            />
          </div>
        </section>

        <PanelSurface
          aria-label="Effect inspector"
          className="paper-stipple-inspector"
          data-toolcraft-theme="dark"
          ref={inspectorRef}
          role="complementary"
        >
          <header className="paper-stipple-inspector-header">
            <strong>{inspectorView === "versions" ? "Presets" : currentForm.label}</strong>
            <div className="paper-stipple-inspector-header-actions">
              <ToolcraftButton
                aria-label="Export PNG"
                className="paper-stipple-export-trigger"
                onClick={exportPng}
                size="xs"
                title="Export PNG"
                type="button"
              >
                Export
              </ToolcraftButton>
              <ToolcraftButton
                aria-label={inspectorView === "versions" ? "Return to editor" : "Open presets"}
                className="paper-stipple-versions-trigger"
                onClick={() => {
                  if (inspectorView === "versions") {
                    setInspectorView("stipple");
                    return;
                  }
                  loadVersions();
                  setInspectorView("versions");
                }}
                size="xs"
                type="button"
                variant="ghost"
              >
                {inspectorView === "versions" ? "Done" : "Presets"}
              </ToolcraftButton>
            </div>
          </header>

          {inspectorView !== "versions" ? (
          <ToggleGroup
            aria-label="Editor controls"
            className="paper-stipple-inspector-tabs"
            onValueChange={(nextViews) => {
              const [nextView] = nextViews;
              if (nextView === "stipple" || nextView === "animation") setInspectorView(nextView);
            }}
            size="sm"
            spacing={2}
            value={inspectorView === "animation" ? ["animation"] : ["stipple"]}
            variant="outline"
          >
            <ToggleGroupItem className="min-w-0 flex-1" value="stipple">Stipple</ToggleGroupItem>
            <ToggleGroupItem className="min-w-0 flex-1" value="animation">Animation</ToggleGroupItem>
          </ToggleGroup>
          ) : null}

          <div className="paper-stipple-inspector-content">
          {inspectorView === "versions" ? (
          <section className="paper-stipple-versions" aria-label="Saved presets">
            <div className="paper-stipple-version-summary">
              <span className="paper-stipple-eyebrow">Saved presets</span>
              <strong>{activeVersionId ? "Applied preset" : "Unsaved setup"}</strong>
            </div>
            <form
              className="paper-stipple-save-version"
              onSubmit={(event) => {
                event.preventDefault();
                saveVersion();
              }}
            >
              <label htmlFor="version-name">
                <span className="sr-only">Preset name</span>
                <input
                  id="version-name"
                  onChange={(event) => setVersionName(event.target.value)}
                  placeholder="Name current setup"
                  value={versionName}
                />
              </label>
              <ToolcraftButton size="sm" type="submit">Save current</ToolcraftButton>
            </form>
            {versionMessage ? <p aria-live="polite" className="paper-stipple-version-message">{versionMessage}</p> : null}
            <div className="paper-stipple-version-list">
              {orderedVersions.map((version) => (
                <div className={`paper-stipple-version-row${activeVersionId === version.id ? " is-active" : ""}`} key={version.id}>
                  <div>
                    <strong>{version.name}</strong>
                    <small>{version.kind === "locked"
                      ? "Baseline"
                      : activeVersionId === version.id
                        ? "Applied"
                        : "Saved"}</small>
                  </div>
                  <div className="paper-stipple-version-actions">
                    <ToolcraftButton
                      disabled={activeVersionId === version.id}
                      onClick={() => restoreVersion(version)}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {activeVersionId === version.id ? "Applied" : "Apply"}
                    </ToolcraftButton>
                    {version.kind === "saved" ? (
                      <>
                        <ToolcraftButton aria-label={`Duplicate ${version.name}`} onClick={() => saveVersion(version)} size="xs" type="button" variant="ghost">Copy</ToolcraftButton>
                        <ToolcraftButton aria-label={`Delete ${version.name}`} className="paper-stipple-version-delete" onClick={() => deleteVersion(version)} size="icon-xs" type="button" variant="ghost">×</ToolcraftButton>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {inspectorView === "stipple" || inspectorView === "shape" ? (
          <section className="paper-stipple-stipple-panel" aria-label="Stipple controls">
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.type}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, type: collapsed }))}
              title="Type"
            >
              <div className={`paper-stipple-type-options${BACKGROUND_CAPABLE_FORMS.has(settings.paperShape) ? " has-background" : ""}`}>
                <div className="paper-stipple-form-picker">
                  <ToolcraftButton
                    aria-haspopup="dialog"
                    aria-label={`Choose type. Current type: ${currentForm.label}.`}
                    className="paper-stipple-picker-button"
                    onClick={() => {
                      setIsColorEditorOpen(false);
                      setColorEditorPosition(null);
                      setIsBackgroundPickerOpen(false);
                      setFormBrowserCategory("all");
                      setIsFormBrowserOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <canvas
                      aria-hidden="true"
                      className="paper-stipple-form-picker-preview"
                      height="120"
                      ref={setCurrentFormPreviewCanvas}
                      width="208"
                    />
                    <span className="paper-stipple-type-option-label">
                      <span>Type</span>
                      <strong>{currentForm.label}</strong>
                    </span>
                  </ToolcraftButton>
                </div>
                {inlinePalette}
                {BACKGROUND_CAPABLE_FORMS.has(settings.paperShape) ? (
                  <div className="paper-stipple-background-picker" ref={backgroundPickerTriggerRef}>
                    <ToolcraftButton
                      aria-expanded={isBackgroundPickerOpen}
                      aria-haspopup="dialog"
                      aria-label={`Choose background. Current background: ${currentFormBackgroundOption.label}.`}
                      className="paper-stipple-picker-button"
                      onClick={() => {
                        setIsColorEditorOpen(false);
                        setColorEditorPosition(null);
                        setIsFormBrowserOpen(false);
                        setIsBackgroundPickerOpen(true);
                      }}
                      type="button"
                      variant="outline"
                    >
                      <span
                        aria-hidden="true"
                        className="paper-stipple-background-picker-preview"
                        data-background={currentFormBackground}
                      />
                      <span className="paper-stipple-type-option-label">
                        <span>Background</span>
                        <strong>{currentFormBackgroundOption.label}</strong>
                      </span>
                    </ToolcraftButton>
                  </div>
                ) : null}
              </div>
              {BACKGROUND_CAPABLE_FORMS.has(settings.paperShape) && currentFormBackground === "gradient" ? (
                <div className="paper-stipple-gradient-control">
                  <Suspense fallback={<div className="paper-stipple-control-loading">Loading gradient controls…</div>}>
                    <ToolcraftGradientControl
                      angle={currentBackgroundGradient.angle}
                      gradientType={currentBackgroundGradient.type}
                      name="Background gradient"
                      onValueChange={(nextGradient) => updateBackgroundGradient({
                        angle: nextGradient.angle,
                        stops: nextGradient.stops,
                        type: nextGradient.gradientType,
                      })}
                      stops={currentBackgroundGradient.stops}
                    />
                  </Suspense>
                </div>
              ) : null}
            </PanelSection>
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.controls}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, controls: collapsed }))}
              title="Controls"
            >
              <div className="paper-stipple-form-details" aria-label={`${currentForm.label} controls`}>
                <Slider
                  id="form-zoom"
                  label="Zoom"
                  max={3}
                  min={0.5}
                  onChange={(value) => updateSetting("formZoom", value)}
                  step={0.05}
                  value={settings.formZoom}
                  valueLabel={`${settings.formZoom.toFixed(2)}×`}
                />
                {LIGHTING_CAPABLE_FORMS.has(settings.paperShape) ? (
                  <div className="paper-stipple-light-control">
                    <Suspense fallback={<div className="paper-stipple-control-loading">Loading light controls…</div>}>
                      <ToolcraftVectorControl
                        defaultValue={{
                          x: DEFAULT_LIGHT_DIRECTIONS[settings.paperShape]?.x.toFixed(2) ?? "-0.78",
                          y: DEFAULT_LIGHT_DIRECTIONS[settings.paperShape]?.y.toFixed(2) ?? "0.72",
                        }}
                        name="Light direction"
                        onValueChange={updateCurrentLightDirection}
                        padCoordinateMode="cartesian"
                        padShape="compact"
                        x={currentLightDirection.x.toFixed(2)}
                        y={currentLightDirection.y.toFixed(2)}
                      />
                    </Suspense>
                  </div>
                ) : null}
                {visibleFormControls.map((control) => {
                  const value = formControlValueFor(control, currentFormControlValues);
                  return (
                    <Slider
                      id={`form-${settings.paperShape}-${control.id}`}
                      key={control.id}
                      label={control.label}
                      max={control.max}
                      min={control.min}
                      onChange={(nextValue) => updateCurrentFormControl(control.id, nextValue)}
                      step={control.step}
                      value={value}
                      valueLabel={formControlValueLabel(control, value)}
                    />
                  );
                })}
              </div>
            </PanelSection>
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.surface}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, surface: collapsed }))}
              title="Surface"
            >
              <Slider
                id="paper-rotation"
                label="Rotate"
                max={180}
                min={-180}
                onChange={(value) => updateSetting("paperRotation", value)}
                step={1}
                value={settings.paperRotation}
                valueLabel={`${Math.round(settings.paperRotation)}°`}
              />
              <Slider
                id="stipple-intensity"
                label="Color blend strength"
                max={1}
                min={0}
                onChange={(value) => updateSetting("intensity", value)}
                step={0.01}
                value={settings.intensity}
                valueLabel={`${Math.round(settings.intensity * 100)}%`}
              />
              <Slider
                id="stipple-softness"
                label={settings.paperShape === 38 ? "Depth blur" : "Edge blur"}
                max={1}
                min={0}
                onChange={(value) => updateSetting("softness", value)}
                step={0.01}
                value={settings.softness}
                valueLabel={`${Math.round(settings.softness * 100)}%`}
              />
            </PanelSection>
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.grain}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, grain: collapsed }))}
              title="Grain"
            >
              <Slider
                id="stipple-grain"
                label="Density"
                max={1}
                min={0}
                onChange={(value) => updateSetting("grain", value)}
                step={0.01}
                value={settings.grain}
                valueLabel={`${Math.round(settings.grain * 100)}%`}
              />
              <Slider
                id="paper-grain-size"
                label="Grain size"
                max={48}
                min={0.125}
                onChange={(value) => updateSetting("paperGrainSize", value)}
                step={0.01}
                value={settings.paperGrainSize}
                valueLabel={`${settings.paperGrainSize.toFixed(2)}×`}
              />
            </PanelSection>
            <details className="paper-stipple-advanced-options">
              <summary>Advanced layout</summary>
              <div>
                <p className="paper-stipple-note">Use these only to fit a virtual canvas. Drag the canvas to position the type.</p>
                <label className="paper-stipple-select" htmlFor="paper-fit">
                  <span>Canvas fit</span>
                  <select
                    id="paper-fit"
                    onChange={(event) => updateSetting("paperFit", event.target.value as PaperFit)}
                    value={settings.paperFit}
                  >
                    {PAPER_FITS.map((fit) => <option key={fit.value} value={fit.value}>{fit.label}</option>)}
                  </select>
                </label>
                <Slider
                  id="paper-world-width"
                  label="Virtual canvas width"
                  max={2400}
                  min={0}
                  onChange={(value) => updateSetting("paperWorldWidth", value)}
                  step={1}
                  value={settings.paperWorldWidth}
                  valueLabel={settings.paperWorldWidth === 0 ? "Auto" : `${Math.round(settings.paperWorldWidth)} px`}
                />
                <Slider
                  id="paper-world-height"
                  label="Virtual canvas height"
                  max={1600}
                  min={0}
                  onChange={(value) => updateSetting("paperWorldHeight", value)}
                  step={1}
                  value={settings.paperWorldHeight}
                  valueLabel={settings.paperWorldHeight === 0 ? "Auto" : `${Math.round(settings.paperWorldHeight)} px`}
                />
                <Slider
                  id="paper-origin-x"
                  label="Canvas anchor horizontal"
                  max={1}
                  min={0}
                  onChange={(value) => updateSetting("paperOriginX", value)}
                  step={0.01}
                  value={settings.paperOriginX}
                  valueLabel={settings.paperOriginX.toFixed(2)}
                />
                <Slider
                  id="paper-origin-y"
                  label="Canvas anchor vertical"
                  max={1}
                  min={0}
                  onChange={(value) => updateSetting("paperOriginY", value)}
                  step={0.01}
                  value={settings.paperOriginY}
                  valueLabel={settings.paperOriginY.toFixed(2)}
                />
              </div>
            </details>
          </section>
          ) : null}

          {inspectorView === "animation" ? (
          <section className="paper-stipple-animation-panel" aria-label="Animation controls">
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.motion}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, motion: collapsed }))}
              title="Motion"
            >
              <Slider
                id="paper-motion-speed"
                label="Motion speed"
                max={6}
                min={-6}
                onChange={updateMotionSpeed}
                step={0.01}
                value={settings.paperMotionSpeed}
                valueLabel={`${settings.paperMotionSpeed.toFixed(2)}×`}
              />
              <SwitchControl
                checked={paperRotationEnabled}
                name="Rotate with motion"
                onCheckedChange={(checked) => updateSetting("paperRotationEnabled", checked)}
              />
              {paperRotationEnabled ? (
                <Slider
                  id="paper-rotation-speed"
                  label="Rotation speed"
                  max={720}
                  min={-720}
                  onChange={(value) => updateSetting("paperRotationSpeed", value)}
                  step={1}
                  value={paperRotationSpeed}
                  valueLabel={`${Math.round(paperRotationSpeed)}°/s`}
                />
              ) : null}
              <details className="paper-stipple-motion-advanced">
                <summary>Manual phase</summary>
                <Slider
                  id="paper-time"
                  label="Phase"
                  max={100}
                  min={0}
                  onChange={(value) => updateSetting("paperTime", value)}
                  step={0.05}
                  value={settings.paperTime}
                  valueLabel={settings.paperTime.toFixed(2)}
                />
              </details>
            </PanelSection>
            <PanelSection
              className="paper-stipple-toolcraft-section"
              collapsed={collapsedInspectorSections.surge}
              collapsible
              onCollapsedChange={(collapsed) => setCollapsedInspectorSections((current) => ({ ...current, surge: collapsed }))}
              title="Surge"
            >
              <div className="paper-stipple-animation-command">
                <span>Temporary acceleration</span>
                <ToolcraftButton
                  aria-label="Run one surge"
                  className="paper-stipple-surge-button"
                  disabled={isSurging}
                  onClick={triggerSurge}
                  size="xs"
                  title="Accelerate, hold at peak speed, then return to the base speed"
                  type="button"
                  variant="default"
                >
                  {isSurging ? "Surging…" : "Surge"}
                </ToolcraftButton>
              </div>
              <Slider
                id="paper-surge-multiplier"
                label="Peak speed"
                max={42}
                min={1.25}
                onChange={(value) => updateSetting("paperSurgeMultiplier", value)}
                step={0.05}
                value={settings.paperSurgeMultiplier}
                valueLabel={`${settings.paperSurgeMultiplier.toFixed(2)}× base`}
              />
              <Slider
                id="paper-surge-ramp-in"
                label="Ramp in"
                max={2000}
                min={50}
                onChange={(value) => updateSetting("paperSurgeRampInMs", value)}
                step={50}
                value={paperSurgeRampInMs}
                valueLabel={`${Math.round(paperSurgeRampInMs)} ms`}
              />
              <Slider
                id="paper-surge-ramp-out"
                label="Ramp out"
                max={2000}
                min={50}
                onChange={(value) => updateSetting("paperSurgeRampOutMs", value)}
                step={50}
                value={paperSurgeRampOutMs}
                valueLabel={`${Math.round(paperSurgeRampOutMs)} ms`}
              />
              <Slider
                id="paper-surge-hold"
                label="Hold"
                max={5000}
                min={0}
                onChange={(value) => updateSetting("paperSurgeHoldMs", value)}
                step={50}
                value={settings.paperSurgeHoldMs}
                valueLabel={`${(settings.paperSurgeHoldMs / 1000).toFixed(2)} s`}
              />
            </PanelSection>
          </section>
          ) : null}
          </div>
        </PanelSurface>
      </div>
      {isFormBrowserOpen ? (
        <aside aria-label="Explore types" className="paper-stipple-form-browser" ref={formBrowserRef}>
          <div className="paper-stipple-form-browser-toolbar">
            <header className="paper-stipple-form-browser-header">
              <div>
                <h2>Explore types</h2>
                <p>Choose a type to update the canvas.</p>
              </div>
              <button aria-label="Close type browser" autoFocus onClick={() => setIsFormBrowserOpen(false)} type="button">×</button>
            </header>
            <div className="paper-stipple-form-browser-filters" aria-label="Type family">
              {FORM_BROWSER_CATEGORIES.map((category) => (
                <button
                  aria-pressed={formBrowserCategory === category.value}
                  key={category.value}
                  onClick={() => setFormBrowserCategory(category.value)}
                  type="button"
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          <div className="paper-stipple-form-grid" aria-label="Available types">
            {formBrowserShapes.map((shape) => (
              <button
                aria-pressed={settings.paperShape === shape.value}
                className="paper-stipple-form-card"
                key={shape.value}
                onClick={() => selectPaperShape(shape.value)}
                type="button"
              >
                <canvas
                  aria-hidden="true"
                  className="paper-stipple-form-card-preview"
                  height="144"
                  ref={(canvas) => {
                    if (canvas) formPreviewCanvasRefs.current.set(shape.value, canvas);
                    else formPreviewCanvasRefs.current.delete(shape.value);
                  }}
                  width="256"
                />
                <span>{shape.label}</span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
      {isBackgroundPickerOpen ? (
        <aside aria-label="Choose background" className="paper-stipple-background-browser" ref={backgroundPickerRef}>
          <div className="paper-stipple-background-browser-toolbar">
            <header className="paper-stipple-form-browser-header">
              <div>
                <h2>Background</h2>
                <p>Choose the field around the form.</p>
              </div>
              <button aria-label="Close background picker" autoFocus onClick={() => setIsBackgroundPickerOpen(false)} type="button">×</button>
            </header>
          </div>
          <div aria-label="Available backgrounds" className="paper-stipple-background-grid">
            {FORM_BACKGROUNDS.map((background) => (
              <button
                aria-pressed={currentFormBackground === background.value}
                className="paper-stipple-background-card"
                key={background.value}
                onClick={() => updateSetting("formBackground", background.value)}
                type="button"
              >
                <span aria-hidden="true" className="paper-stipple-background-card-preview" data-background={background.value} />
                <span>{background.label}</span>
                <small>{background.description}</small>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </main>
  );
}

export default StippleFromPaper;
