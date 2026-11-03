import { grainGradientFragmentShader } from "./upstream/shaders/grain-gradient.ts";
import { getShaderNoiseTexture } from "./upstream/get-shader-noise-texture.ts";
import { vertexShaderSource } from "./upstream/vertex-shader.ts";

// Keep live editor instances aligned with the current Paper shader during
// development. The renderer compiles the source only when it is constructed.
export const PAPER_REFERENCE_SHADER_KEY = grainGradientFragmentShader;

export type PaperFit = "none" | "contain" | "cover";
export type FormBackground =
  | "quiet" | "gradient" | "layers" | "contour"
  | "glow" | "flow" | "facets" | "wash";
// Kept as an alias so saved editor snapshots from the first Soft cube-only
// release can be migrated without losing their selection.
export type SoftCubeBackground = FormBackground;
export type PaperShape =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24
  | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38;

export type FormControlValues = Record<string, number>;

export type BackgroundGradientType = "linear" | "radial" | "angular" | "diamond";

export type BackgroundGradientStop = {
  color: string;
  opacity?: number;
  position: string;
};

export type BackgroundGradient = {
  angle: number;
  stops: readonly BackgroundGradientStop[];
  type: BackgroundGradientType;
};

export const PAPER_CONTROL_DEFAULTS = {
  outputColorMode: "styled" as const,
  paperMotionSpeed: 1,
  paperSurgeHoldMs: 300,
  paperSurgeMultiplier: 15,
  paperSurgeRampInMs: 300,
  paperSurgeRampOutMs: 1000,
  paperFit: "none" as PaperFit,
  paperGrainSize: 1,
  formZoom: 1,
  paperOffsetX: 0,
  paperOffsetY: 0,
  paperOriginX: 0.5,
  paperOriginY: 0.5,
  paperRotation: 0,
  paperRotationEnabled: false,
  paperRotationSpeed: 45,
  paperShape: 1 as PaperShape,
  formBackground: "gradient" as FormBackground,
  paperTime: 5.55,
  paperWorldHeight: 0,
  paperWorldWidth: 0,
  formControlSchema: "semantic-form-controls-v2",
  formControlVersion: 4,
  formControls: {} as Record<string, FormControlValues>,
};

export type StippleSettings = {
  outputColorMode: "styled" | "exact" | "transparent";
  formZoom: number;
  intensity: number;
  grain: number;
  softness: number;
  seed: number;
  paperMotionSpeed: number;
  paperSurgeHoldMs: number;
  paperSurgeMultiplier: number;
  paperSurgeRampInMs: number;
  paperSurgeRampOutMs: number;
  paperFit: PaperFit;
  paperGrainSize: number;
  paperOffsetX: number;
  paperOffsetY: number;
  paperOriginX: number;
  paperOriginY: number;
  paperRotation: number;
  paperRotationEnabled: boolean;
  paperRotationSpeed: number;
  paperShape: PaperShape;
  formBackground: FormBackground;
  backgroundGradient?: BackgroundGradient;
  softCubeBackground?: FormBackground;
  paperTime: number;
  paperWorldHeight: number;
  paperWorldWidth: number;
  formControlSchema: string;
  formControlVersion: number;
  formControls: Record<string, FormControlValues>;
  palette: [string, string, string];
};

export type PaperReferenceOptions = {
  background: string;
  backgroundAlpha?: number;
  colorMode?: "styled" | "exact";
  colors: readonly string[];
  fit?: PaperFit;
  formControls?: readonly number[];
  formZoom?: number;
  grainSize?: number;
  height?: number;
  intensity: number;
  noise: number;
  offsetX?: number;
  offsetY?: number;
  originX?: number;
  originY?: number;
  rotation?: number;
  scale?: number;
  softness: number;
  shape?: number;
  formBackground?: FormBackground;
  backgroundGradient?: BackgroundGradient;
  lightDirection?: { x: number; y: number };
  time?: number;
  width?: number;
  worldHeight?: number;
  worldWidth?: number;
};

function compileShader(
  context: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = context.createShader(type);
  if (!shader) throw new Error("Unable to create a WebGL shader.");
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const log = context.getShaderInfoLog(shader) ?? "No compiler log.";
    context.deleteShader(shader);
    throw new Error(`Paper reference shader failed to compile: ${log}`);
  }
  return shader;
}

function createProgram(context: WebGL2RenderingContext): WebGLProgram {
  const vertex = compileShader(context, context.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(
    context,
    context.FRAGMENT_SHADER,
    grainGradientFragmentShader,
  );
  const program = context.createProgram();
  if (!program) throw new Error("Unable to create a WebGL program.");
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  context.deleteShader(vertex);
  context.deleteShader(fragment);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const log = context.getProgramInfoLog(program) ?? "No linker log.";
    context.deleteProgram(program);
    throw new Error(`Paper reference shader failed to link: ${log}`);
  }
  return program;
}

function hexToRgba(
  value: string,
  alpha = 1,
  preserveSrgb = false,
): readonly [number, number, number, number] {
  const normalized = value.trim().replace(/^#/, "");
  const hex = normalized.length === 3
    ? normalized.split("").map((channel) => channel + channel).join("")
    : normalized;
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const channels = [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ] as const;
    if (preserveSrgb) return [...channels, alpha];
    const toLinear = (channel: number): number => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return [
      toLinear(channels[0]),
      toLinear(channels[1]),
      toLinear(channels[2]),
      alpha,
    ];
  }

  // The editor only persists hex colours. Keep a predictable fallback rather
  // than loading a general-purpose colour library into the live render path.
  return [0, 0, 0, alpha];
}

const MAX_BACKGROUND_GRADIENT_STOPS = 5;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizedGradientPosition(position: string): number {
  const parsed = Number.parseFloat(position);
  return Number.isFinite(parsed) ? clamp(parsed / 100) : 0;
}

function normalizeBackgroundGradient(
  gradient: BackgroundGradient | undefined,
  fallbackColor: string,
): BackgroundGradient {
  const fallback: BackgroundGradient = {
    angle: 90,
    stops: [
      { color: fallbackColor, opacity: 100, position: "0%" },
      { color: fallbackColor, opacity: 100, position: "100%" },
    ],
    type: "linear",
  };
  if (!gradient || !Number.isFinite(gradient.angle) || gradient.stops.length < 2) {
    return fallback;
  }

  const stops = gradient.stops
    .slice(0, MAX_BACKGROUND_GRADIENT_STOPS)
    .map((stop) => ({
      color: typeof stop.color === "string" ? stop.color : fallbackColor,
      opacity: clamp(Number.isFinite(stop.opacity) ? stop.opacity! : 100, 0, 100),
      position: `${Math.round(normalizedGradientPosition(stop.position) * 100)}%`,
    }))
    .sort((left, right) => normalizedGradientPosition(left.position) - normalizedGradientPosition(right.position));

  return {
    angle: Math.round(gradient.angle),
    stops: stops.length >= 2 ? stops : fallback.stops,
    type: gradient.type === "radial" || gradient.type === "angular" || gradient.type === "diamond"
      ? gradient.type
      : "linear",
  };
}

/**
 * This small host intentionally executes the unmodified Paper vertex and
 * fragment shader source from `upstream/`; only the canvas mount plumbing is
 * new. It is comparison-only and never participates in export.
 */
export class PaperReferenceRenderer {
  private readonly context: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly noiseTexture: WebGLTexture;
  private readonly noiseImage = getShaderNoiseTexture();
  private noiseReady = false;
  private lastOptions: PaperReferenceOptions = {
    background: "#11122f",
    colors: ["#39296e", "#db5579", "#f5c36c"],
    intensity: 0.55,
    noise: 0.35,
    softness: 0.42,
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onReady?: () => void,
  ) {
    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      // Paper's fragment shader emits premultiplied pigment. Matching that
      // contract lets the visible canvas preserve clean transparent exports.
      premultipliedAlpha: true,
    });
    if (!context) throw new Error("WebGL2 is required for the Paper reference renderer.");
    this.context = context;
    this.program = createProgram(context);

    const positionBuffer = context.createBuffer();
    if (!positionBuffer) throw new Error("Unable to allocate Paper reference geometry.");
    this.positionBuffer = positionBuffer;
    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      context.STATIC_DRAW,
    );

    const noiseTexture = context.createTexture();
    if (!noiseTexture) throw new Error("Unable to allocate the Paper noise texture.");
    this.noiseTexture = noiseTexture;
    const uploadNoise = (): void => {
      if (!this.noiseImage) return;
      context.bindTexture(context.TEXTURE_2D, noiseTexture);
      context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 1);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.REPEAT);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.REPEAT);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        context.RGBA,
        context.UNSIGNED_BYTE,
        this.noiseImage,
      );
      this.noiseReady = true;
      this.render();
      this.onReady?.();
    };
    if (this.noiseImage) {
      this.noiseImage.addEventListener("load", uploadNoise, { once: true });
      if (this.noiseImage.complete) uploadNoise();
    }
  }

  render(options: PaperReferenceOptions = this.lastOptions): void {
    this.lastOptions = options;
    if (!this.noiseReady) return;
    const { context } = this;
    const width = Math.max(1, options.width ?? (this.canvas.clientWidth || 720));
    const height = Math.max(1, options.height ?? (this.canvas.clientHeight || 320));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    context.viewport(0, 0, width, height);
    context.useProgram(this.program);
    const attribute = context.getAttribLocation(this.program, "a_position");
    context.bindBuffer(context.ARRAY_BUFFER, this.positionBuffer);
    context.enableVertexAttribArray(attribute);
    context.vertexAttribPointer(attribute, 2, context.FLOAT, false, 0, 0);

    const uniform1f = (name: string, value: number): void => {
      context.uniform1f(context.getUniformLocation(this.program, name), value);
    };
    const uniform2f = (name: string, x: number, y: number): void => {
      context.uniform2f(context.getUniformLocation(this.program, name), x, y);
    };
    uniform1f("u_time", options.time ?? 0);
    uniform2f("u_resolution", width, height);
    uniform1f("u_pixelRatio", 1);
    uniform1f("u_worldWidth", options.worldWidth ?? 0);
    uniform1f("u_worldHeight", options.worldHeight ?? 0);
    uniform1f("u_fit", options.fit === "contain" ? 1 : options.fit === "cover" ? 2 : 0);
    uniform1f("u_scale", options.scale ?? 1);
    uniform1f("u_formZoom", options.formZoom ?? 1);
    uniform1f("u_rotation", options.rotation ?? 0);
    uniform1f("u_offsetX", options.offsetX ?? 0);
    uniform1f("u_offsetY", options.offsetY ?? 0);
    uniform1f("u_originX", options.originX ?? 0.5);
    uniform1f("u_originY", options.originY ?? 0.5);
    uniform1f("u_imageAspectRatio", 1);
    uniform1f("u_softness", options.softness);
    uniform1f("u_intensity", options.intensity);
    uniform1f("u_noise", options.noise);
    uniform1f("u_grainSize", options.grainSize ?? 1);
    uniform1f("u_shape", options.shape ?? 7);
    const formBackground = options.formBackground ?? "gradient";
    const formBackgroundIndex: Record<FormBackground, number> = {
      quiet: 0,
      gradient: 1,
      layers: 2,
      contour: 3,
      glow: 4,
      flow: 5,
      facets: 6,
      wash: 7,
    };
    uniform1f("u_formBackground", formBackgroundIndex[formBackground]);
    const formControls = options.formControls ?? [];
    uniform1f("u_formA", formControls[0] ?? 1);
    uniform1f("u_formB", formControls[1] ?? 1);
    uniform1f("u_formC", formControls[2] ?? 1);
    uniform1f("u_formD", formControls[3] ?? 1);
    uniform1f("u_formE", formControls[4] ?? 1);
    uniform1f("u_formF", formControls[5] ?? 1);
    uniform1f("u_colorsCount", options.colors.length);
    const backgroundGradient = normalizeBackgroundGradient(
      options.backgroundGradient,
      options.background,
    );
    const backgroundGradientType: Record<BackgroundGradientType, number> = {
      linear: 0,
      radial: 1,
      angular: 2,
      diamond: 3,
    };
    const gradientStops = Array.from(
      { length: MAX_BACKGROUND_GRADIENT_STOPS },
      (_, index) => backgroundGradient.stops[Math.min(index, backgroundGradient.stops.length - 1)]!,
    );
    uniform1f("u_backgroundGradientType", backgroundGradientType[backgroundGradient.type]);
    uniform1f("u_backgroundGradientAngle", backgroundGradient.angle);
    uniform1f("u_backgroundGradientCount", backgroundGradient.stops.length);
    context.uniform1fv(
      context.getUniformLocation(this.program, "u_backgroundGradientPositions[0]"),
      new Float32Array(gradientStops.map((stop) => normalizedGradientPosition(stop.position))),
    );
    context.uniform4fv(
      context.getUniformLocation(this.program, "u_backgroundGradientColors[0]"),
      new Float32Array(gradientStops.flatMap((stop) => hexToRgba(
        stop.color,
        (stop.opacity ?? 100) / 100,
        options.colorMode === "exact",
      ))),
    );
    context.uniform2f(
      context.getUniformLocation(this.program, "u_lightDirection"),
      options.lightDirection?.x ?? -0.78,
      options.lightDirection?.y ?? 0.72,
    );

    context.uniform4fv(
      context.getUniformLocation(this.program, "u_colorBack"),
      new Float32Array(hexToRgba(
        options.background,
        options.backgroundAlpha ?? 1,
        options.colorMode === "exact",
      )),
    );
    const palette = Array.from({ length: 7 }, (_, index) =>
      hexToRgba(
        options.colors[Math.min(index, options.colors.length - 1)] ?? "#000000",
        1,
        options.colorMode === "exact",
      ),
    ).flat();
    context.uniform4fv(
      context.getUniformLocation(this.program, "u_colors[0]"),
      new Float32Array(palette),
    );
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, this.noiseTexture);
    context.uniform1i(context.getUniformLocation(this.program, "u_noiseTexture"), 0);
    context.drawArrays(context.TRIANGLES, 0, 6);
  }

  dispose(): void {
    this.context.deleteTexture(this.noiseTexture);
    this.context.deleteBuffer(this.positionBuffer);
    this.context.deleteProgram(this.program);
  }
}
