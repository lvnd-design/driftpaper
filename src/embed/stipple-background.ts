import { cloneDocument, cloneSettings } from "../effects/stipple-from-paper/presets.ts";
import { paperOptionsFor } from "../effects/stipple-from-paper/render-options.ts";
import {
  PaperReferenceRenderer,
  type StippleSettings,
} from "../effects/stipple-from-paper/stipple-renderer.ts";
import type { StippleDocument } from "../effects/stipple-from-paper/document.ts";

/**
 * A portable, framework-free entry point for using a Stipple From Paper
 * snapshot as a live, animated background in another app. This file and its
 * imports have no React / toolcraft dependency — only the WebGL renderer and
 * plain settings data, so it can be bundled and dropped in anywhere.
 */

export type StippleSnapshot = {
  /** Schema version of this JSON shape, bumped only if the shape changes. */
  version: 1;
  name?: string;
  document: StippleDocument;
  settings: StippleSettings;
};

export type StippleBackgroundHandle = {
  /** Swap in a different snapshot without tearing down the WebGL context. */
  update(snapshot: StippleSnapshot): void;
  /** Stop the animation loop and free GPU resources. */
  dispose(): void;
};

const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Mounts an animated Stipple From Paper background onto `canvas`. Size the
 * canvas with CSS (it reads clientWidth/clientHeight every frame) the same
 * way you'd size a background image or video.
 */
export function mountStippleBackground(
  canvas: HTMLCanvasElement,
  snapshot: StippleSnapshot,
): StippleBackgroundHandle {
  let document: StippleDocument = cloneDocument(snapshot.document);
  let settings: StippleSettings = cloneSettings(snapshot.settings);
  let disposed = false;
  let frame = 0;
  let startedAt = 0;
  let startingTime = settings.paperTime;
  let startingRotation = settings.paperRotation;

  const sizeOf = (): { width: number; height: number } => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    return {
      width: Math.max(1, Math.round(canvas.clientWidth * ratio)),
      height: Math.max(1, Math.round(canvas.clientHeight * ratio)),
    };
  };

  const renderAt = (paperTime: number, paperRotation: number): void => {
    const { width, height } = sizeOf();
    renderer.render(paperOptionsFor(document, settings, width, height, paperTime, paperRotation));
  };

  // No onReady callback: it can fire synchronously inside the constructor
  // (cached noise texture), and the frame loop below renders once ready anyway.
  const renderer = new PaperReferenceRenderer(canvas);

  const resetClock = (): void => {
    startedAt = performance.now();
    startingTime = settings.paperTime;
    startingRotation = settings.paperRotation;
  };
  resetClock();

  const tick = (now: number): void => {
    if (disposed) return;
    const elapsed = (now - startedAt) / 1000;
    const paperTime = startingTime + elapsed * settings.paperMotionSpeed;
    const paperRotation = settings.paperRotationEnabled
      ? startingRotation + elapsed * settings.paperRotationSpeed
      : startingRotation;
    renderAt(paperTime, paperRotation);
    frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);

  return {
    update(nextSnapshot) {
      document = cloneDocument(nextSnapshot.document);
      settings = cloneSettings(nextSnapshot.settings);
      resetClock();
    },
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frame);
      renderer.dispose();
    },
  };
}

/** Convenience fetch + parse for a snapshot JSON file (e.g. served from a CDN). */
export async function fetchStippleSnapshot(url: string): Promise<StippleSnapshot> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Stipple snapshot (${response.status}): ${url}`);
  }
  return response.json() as Promise<StippleSnapshot>;
}
