export type BackgroundLayer = {
  id: string;
  kind: "background";
  name: string;
  color: string;
  opacity: number;
  visible: boolean;
};

export type BlobLayer = {
  id: string;
  kind: "blob";
  name: string;
  color: string;
  feather: number;
  height: number;
  opacity: number;
  rotation: number;
  visible: boolean;
  width: number;
  x: number;
  y: number;
  /**
   * Optional shared-wave geometry used by saved pigment explorations. When
   * absent, the layer remains the existing soft radial field.
   */
  flow?: {
    amplitude: number;
    phase: number;
    slope: number;
  };
};

export type CompositionLayer = BackgroundLayer | BlobLayer;

export type StippleDocument = {
  height: number;
  layers: CompositionLayer[];
  width: number;
};

export type RenderedDocumentLayer = {
  canvas: HTMLCanvasElement;
  color: string;
  id: string;
  isPigment: boolean;
};

export const OUTPUT_SIZE = { width: 1200, height: 800 } as const;

export function createInitialDocument(): StippleDocument {
  return {
    ...OUTPUT_SIZE,
    layers: [
      { id: "background", kind: "background", name: "Blue paper", color: "#add5e9", opacity: 1, visible: true },
      { id: "blue", kind: "blob", name: "Blue field", color: "#1676ee", feather: 0.72, height: 570, opacity: 1, rotation: -7, visible: true, width: 560, x: 250, y: 585 },
      { id: "yellow", kind: "blob", name: "Yellow field", color: "#f3bc18", feather: 0.72, height: 510, opacity: 0.92, rotation: 7, visible: true, width: 430, x: 600, y: 650 },
      { id: "violet", kind: "blob", name: "Violet field", color: "#9361ef", feather: 0.72, height: 500, opacity: 0.94, rotation: -4, visible: true, width: 450, x: 820, y: 625 },
      { id: "pink", kind: "blob", name: "Pink field", color: "#fb75ad", feather: 0.72, height: 540, opacity: 0.9, rotation: 5, visible: true, width: 430, x: 1080, y: 620 },
    ],
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgb(${red} ${green} ${blue} / ${opacity})`;
}

function renderBlob(context: CanvasRenderingContext2D, layer: BlobLayer): void {
  if (layer.flow) {
    renderFlowBlob(context, layer);
    return;
  }
  context.save();
  context.translate(layer.x, layer.y);
  context.rotate(layer.rotation * Math.PI / 180);
  context.scale(layer.width / layer.height, 1);
  const radius = layer.height / 2;
  const gradient = context.createRadialGradient(-radius * 0.15, -radius * 0.15, 0, 0, 0, radius);
  gradient.addColorStop(0, hexToRgba(layer.color, layer.opacity));
  gradient.addColorStop(Math.max(0.1, 1 - layer.feather), hexToRgba(layer.color, layer.opacity * 0.92));
  gradient.addColorStop(1, hexToRgba(layer.color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function renderFlowBlob(context: CanvasRenderingContext2D, layer: BlobLayer): void {
  const flow = layer.flow;
  if (!flow) return;

  const left = layer.x - layer.width / 2;
  const right = layer.x + layer.width / 2;
  const top = layer.y - layer.height / 2;
  const bottom = layer.y + layer.height / 2;
  const steps = 36;
  const sideFade = Math.min(0.38, Math.max(0.16, layer.feather * 0.82));
  const pigment = context.createLinearGradient(left, 0, right, 0);
  pigment.addColorStop(0, hexToRgba(layer.color, 0));
  pigment.addColorStop(sideFade, hexToRgba(layer.color, layer.opacity));
  pigment.addColorStop(1 - sideFade, hexToRgba(layer.color, layer.opacity));
  pigment.addColorStop(1, hexToRgba(layer.color, 0));

  context.save();
  context.filter = `blur(${Math.max(2, layer.feather * 24)}px)`;
  context.fillStyle = pigment;
  context.beginPath();
  context.moveTo(left, bottom);
  context.lineTo(right, bottom);
  for (let step = steps; step >= 0; step -= 1) {
    const progress = step / steps;
    const x = left + layer.width * progress;
    const y = top + layer.height * (
      0.18 +
      flow.slope * (progress - 0.5) +
      flow.amplitude * Math.sin(progress * Math.PI * 1.15 + flow.phase)
    );
    context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function prepareCanvas(canvas: HTMLCanvasElement, document: StippleDocument): CanvasRenderingContext2D {
  canvas.width = document.width;
  canvas.height = document.height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");
  context.clearRect(0, 0, document.width, document.height);
  return context;
}

function renderLayer(context: CanvasRenderingContext2D, document: StippleDocument, layer: CompositionLayer): void {
  if (layer.kind === "background") {
    context.globalAlpha = layer.opacity;
    context.fillStyle = layer.color;
    context.fillRect(0, 0, document.width, document.height);
    context.globalAlpha = 1;
    return;
  }
  renderBlob(context, layer);
}

export function renderDocument(canvas: HTMLCanvasElement, document: StippleDocument): void {
  const context = prepareCanvas(canvas, document);

  for (const layer of document.layers) {
    if (!layer.visible) continue;
    renderLayer(context, document, layer);
  }
}

/**
 * Preserves each editable color field before compositing. This lets the
 * renderer vary a field's particle density without converting its pigment
 * into a dark value from the already-merged source image.
 */
export function renderDocumentLayers(document: StippleDocument): RenderedDocumentLayer[] {
  return document.layers.flatMap((layer) => {
    if (!layer.visible) return [];
    const canvas = window.document.createElement("canvas");
    const context = prepareCanvas(canvas, document);
    renderLayer(context, document, layer);
    return [{ canvas, color: layer.color, id: layer.id, isPigment: layer.kind === "blob" }];
  });
}

export function addBlob(document: StippleDocument): StippleDocument {
  const ordinal = document.layers.filter((layer) => layer.kind === "blob").length + 1;
  let nextId = ordinal;
  while (document.layers.some((layer) => layer.id === `blob-${nextId}`)) nextId += 1;
  return {
    ...document,
    layers: [
      ...document.layers,
      {
        id: `blob-${nextId}`,
        kind: "blob",
        name: `New field ${ordinal}`,
        color: "#00bfff",
        feather: 0.68,
        height: 360,
        opacity: 0.86,
        rotation: 0,
        visible: true,
        width: 360,
        x: 600,
        y: 440,
      },
    ],
  };
}
