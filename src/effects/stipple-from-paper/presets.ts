import {
  PAPER_CONTROL_DEFAULTS,
  type BackgroundGradient,
  type BackgroundGradientType,
  type FormControlValues,
  type FormBackground,
  type StippleSettings,
} from "./stipple-renderer.ts";
import type { StippleDocument } from "./document.ts";
import { createInitialDocument } from "./document.ts";

export type StipplePresetId = "hard-pigment";

export type StipplePreset = {
  description: string;
  document: StippleDocument;
  id: StipplePresetId;
  label: string;
  settings: StippleSettings;
  swatches: readonly [string, string, string];
};

function createHardPigmentDocument(): StippleDocument {
  const document = createInitialDocument();
  return {
    ...document,
    layers: document.layers.map((layer) => {
      if (layer.kind !== "blob") return layer;
      if (layer.id === "blue") {
        return { ...layer, feather: 0.62, height: 700, width: 800, x: 180, y: 620 };
      }
      if (layer.id === "yellow") {
        return { ...layer, feather: 0.62, height: 720, width: 820, x: 500, y: 630 };
      }
      if (layer.id === "violet") {
        return { ...layer, feather: 0.62, height: 700, width: 820, x: 800, y: 630 };
      }
      return { ...layer, feather: 0.62, height: 690, width: 700, x: 1080, y: 620 };
    }),
  };
}

export const STIPPLE_PRESETS: readonly StipplePreset[] = [{
  description: "Dense Paper pigment with firm color contours.",
  document: createHardPigmentDocument(),
  id: "hard-pigment",
  label: "Hard pigment",
  settings: {
    ...PAPER_CONTROL_DEFAULTS,
    outputColorMode: "styled",
    grain: 0.42,
    intensity: 0.72,
    palette: ["#7300ff", "#eba8ff", "#00bfff"],
    seed: 37,
    softness: 0,
  },
  swatches: ["#add5e9", "#1676ee", "#fb75ad"],
}];

export function cloneDocument(document: StippleDocument): StippleDocument {
  return { ...document, layers: document.layers.map((layer) => ({ ...layer })) };
}

function cloneFormControls(value: unknown): Record<string, FormControlValues> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([shape, controls]) => {
      if (!controls || typeof controls !== "object" || Array.isArray(controls)) return [];
      const supportedControls: FormControlValues = {};
      for (const [key, control] of Object.entries(controls)) {
        if (typeof control === "number" && Number.isFinite(control)) {
          supportedControls[key] = control;
        }
      }
      return [[shape, supportedControls]];
    }),
  );
}

function isFormBackground(value: unknown): value is FormBackground {
  return value === "quiet" || value === "gradient" || value === "layers" ||
    value === "contour" || value === "glow" || value === "flow" ||
    value === "facets" || value === "wash";
}

function isBackgroundGradientType(value: unknown): value is BackgroundGradientType {
  return value === "linear" || value === "radial" || value === "angular" || value === "diamond";
}

function cloneBackgroundGradient(value: unknown): BackgroundGradient | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const gradient = value as Partial<BackgroundGradient>;
  const angle = gradient.angle;
  const type = gradient.type;
  if (typeof angle !== "number" || !Number.isFinite(angle) || !isBackgroundGradientType(type) || !Array.isArray(gradient.stops)) {
    return undefined;
  }
  const stops = gradient.stops
    .filter((stop) => stop && typeof stop.color === "string" && typeof stop.position === "string")
    .slice(0, 5)
    .map((stop) => ({
      color: stop.color,
      opacity: typeof stop.opacity === "number" && Number.isFinite(stop.opacity) ? stop.opacity : 100,
      position: stop.position,
    }));
  if (stops.length < 2) return undefined;
  return { angle, stops, type };
}

// This editor has autonomous motion rather than a play/pause transport. Keep
// legacy snapshots that were saved at zero moving at the slowest perceptible
// rate, so applying a preset can never silently freeze the canvas.
function normalizeMotionSpeed(value: unknown): number {
  const fallback = PAPER_CONTROL_DEFAULTS.paperMotionSpeed;
  const speed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  if (Math.abs(speed) >= 0.01) return speed;
  return (speed < 0 ? -1 : 1) * 0.01;
}

export function cloneSettings(settings: StippleSettings): StippleSettings {
  const {
    backgroundMode: _backgroundMode,
    paperLoopDuration: _paperLoopDuration,
    paperMotionMode: _paperMotionMode,
    formDetails: _formDetails,
    softCubeBackground: legacySoftCubeBackground,
    paperPulseMultiplier: legacyPaperPulseMultiplier,
    paperSurgeRampMs: legacyPaperSurgeRampMs,
    grainScale: legacyGrainScale,
    ...supportedSettings
  } = settings as StippleSettings & {
    backgroundMode?: unknown;
    paperLoopDuration?: unknown;
    paperMotionMode?: unknown;
    formDetails?: unknown;
    paperPulseMultiplier?: unknown;
    paperSurgeRampMs?: unknown;
    grainScale?: unknown;
  };
  // Grain field scale used to be a second, inverse grain-size control. Fold
  // that legacy value into the one remaining Grain size setting so saved work
  // stays visually stable while the redundant parameter disappears.
  const grainFieldScale = typeof legacyGrainScale === "number" && Number.isFinite(legacyGrainScale) && legacyGrainScale > 0
    ? legacyGrainScale
    : 1;
  const paperGrainSize = Number.isFinite(supportedSettings.paperGrainSize)
    ? Math.max(.125, supportedSettings.paperGrainSize / grainFieldScale)
    : PAPER_CONTROL_DEFAULTS.paperGrainSize;
  return {
    ...PAPER_CONTROL_DEFAULTS,
    ...supportedSettings,
    paperMotionSpeed: normalizeMotionSpeed(supportedSettings.paperMotionSpeed),
    paperSurgeMultiplier: Number.isFinite(supportedSettings.paperSurgeMultiplier)
      ? Math.max(1, supportedSettings.paperSurgeMultiplier)
      : Number.isFinite(legacyPaperPulseMultiplier)
        ? Math.max(1, legacyPaperPulseMultiplier as number)
        : PAPER_CONTROL_DEFAULTS.paperSurgeMultiplier,
    paperSurgeRampInMs: Number.isFinite(supportedSettings.paperSurgeRampInMs)
      ? Math.max(50, supportedSettings.paperSurgeRampInMs)
      : Number.isFinite(legacyPaperSurgeRampMs)
        ? Math.max(50, legacyPaperSurgeRampMs as number)
        : PAPER_CONTROL_DEFAULTS.paperSurgeRampInMs,
    paperSurgeRampOutMs: Number.isFinite(supportedSettings.paperSurgeRampOutMs)
      ? Math.max(50, supportedSettings.paperSurgeRampOutMs)
      : Number.isFinite(legacyPaperSurgeRampMs)
        ? Math.max(50, legacyPaperSurgeRampMs as number)
        : PAPER_CONTROL_DEFAULTS.paperSurgeRampOutMs,
    paperGrainSize,
    paperShape: settings.paperShape === 0 || settings.paperShape === 12 ? 1 : settings.paperShape,
    formBackground: isFormBackground(supportedSettings.formBackground)
      ? supportedSettings.formBackground
      : isFormBackground(legacySoftCubeBackground)
        ? legacySoftCubeBackground
        : PAPER_CONTROL_DEFAULTS.formBackground,
    backgroundGradient: cloneBackgroundGradient(supportedSettings.backgroundGradient),
    formControlSchema: "semantic-form-controls-v2",
    formControlVersion: 4,
    formControls: supportedSettings.formControlSchema === "semantic-form-controls-v2" && supportedSettings.formControlVersion === 4
      ? cloneFormControls(supportedSettings.formControls)
      : {},
    palette: [...settings.palette] as [string, string, string],
  };
}
