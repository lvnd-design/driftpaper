export type FixtureId =
  | "prism-gradient"
  | "overlap"
  | "sphere"
  | "hard-edges"
  | "transparent";

export const FIXTURES: ReadonlyArray<{ id: FixtureId; label: string }> = [
  { id: "prism-gradient", label: "Multicolor gradient" },
  { id: "overlap", label: "Overlapping shapes" },
  { id: "sphere", label: "Shaded sphere" },
  { id: "hard-edges", label: "Hard color boundaries" },
  { id: "transparent", label: "Transparent edges" },
];

export const OUTPUT_WIDTH = 1200;
export const OUTPUT_HEIGHT = 800;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function drawMulticolorGradient(context: CanvasRenderingContext2D): void {
  // A light, airy source field makes the source-aware pigment breakup easy
  // to judge: saturated pools should resolve into dense dots, while the
  // quiet blue paper remains largely open.
  context.fillStyle = "#add5e9";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  // One continuous, overlapping pigment field—not isolated circles—matches
  // the supplied visual references and avoids judging the treatment on a
  // source with accidental empty rings.
  const pigmentField = context.createLinearGradient(0, 0, OUTPUT_WIDTH, 0);
  pigmentField.addColorStop(0, "#1269ed");
  pigmentField.addColorStop(0.25, "#2299f4");
  pigmentField.addColorStop(0.48, "#f5c21a");
  pigmentField.addColorStop(0.69, "#9a5ff2");
  pigmentField.addColorStop(1, "#fc74ae");
  context.fillStyle = pigmentField;
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const openPaper = context.createLinearGradient(0, 0, 0, OUTPUT_HEIGHT);
  openPaper.addColorStop(0, "#add5e9");
  openPaper.addColorStop(0.32, "rgba(173, 213, 233, 0.98)");
  openPaper.addColorStop(0.54, "rgba(173, 213, 233, 0.43)");
  openPaper.addColorStop(0.76, "rgba(173, 213, 233, 0.04)");
  openPaper.addColorStop(1, "rgba(173, 213, 233, 0)");
  context.fillStyle = openPaper;
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
}

function drawOverlappingShapes(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#f3efe8";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const large = context.createLinearGradient(170, 120, 865, 600);
  large.addColorStop(0, "#cf3f70");
  large.addColorStop(0.58, "#6325a4");
  large.addColorStop(1, "#162660");
  context.fillStyle = large;
  roundedRect(context, 120, 100, 690, 535, 124);
  context.fill();

  const circle = context.createRadialGradient(876, 292, 16, 876, 292, 240);
  circle.addColorStop(0, "#fcf3b8");
  circle.addColorStop(0.38, "#f6a255");
  circle.addColorStop(1, "#e94c6d");
  context.fillStyle = circle;
  context.beginPath();
  context.arc(876, 292, 218, 0, Math.PI * 2);
  context.fill();

  const ribbon = context.createLinearGradient(0, 540, OUTPUT_WIDTH, 630);
  ribbon.addColorStop(0, "#0c4d69");
  ribbon.addColorStop(0.45, "#13b8b0");
  ribbon.addColorStop(1, "#e4f1c6");
  context.fillStyle = ribbon;
  context.save();
  context.translate(611, 579);
  context.rotate(-0.1);
  roundedRect(context, -570, -54, 1170, 112, 56);
  context.fill();
  context.restore();
}

function drawSphere(context: CanvasRenderingContext2D): void {
  const backdrop = context.createLinearGradient(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  backdrop.addColorStop(0, "#0e204d");
  backdrop.addColorStop(1, "#090a20");
  context.fillStyle = backdrop;
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const shadow = context.createRadialGradient(610, 650, 10, 610, 650, 380);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.65)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = shadow;
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const sphere = context.createRadialGradient(440, 252, 14, 580, 390, 330);
  sphere.addColorStop(0, "#fff7ca");
  sphere.addColorStop(0.16, "#ffc36f");
  sphere.addColorStop(0.45, "#ec5d71");
  sphere.addColorStop(0.73, "#7c2ea7");
  sphere.addColorStop(1, "#16133e");
  context.fillStyle = sphere;
  context.beginPath();
  context.arc(600, 380, 300, 0, Math.PI * 2);
  context.fill();

  const reflection = context.createLinearGradient(0, 420, 0, 650);
  reflection.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  reflection.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = reflection;
  context.beginPath();
  context.arc(600, 380, 300, 0, Math.PI * 2);
  context.fill();
}

function drawHardEdges(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#f6efd8";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.fillStyle = "#d95157";
  context.fillRect(0, 0, 400, 800);
  context.fillStyle = "#135d8b";
  context.fillRect(400, 0, 400, 800);
  context.fillStyle = "#e8b144";
  context.fillRect(800, 0, 400, 800);
  context.fillStyle = "#24323e";
  context.fillRect(115, 192, 970, 414);
  context.fillStyle = "#f6efd8";
  context.beginPath();
  context.moveTo(355, 513);
  context.lineTo(602, 152);
  context.lineTo(846, 513);
  context.closePath();
  context.fill();
}

function drawTransparent(context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const large = context.createRadialGradient(400, 300, 0, 490, 365, 360);
  large.addColorStop(0, "rgba(255, 246, 186, 0.96)");
  large.addColorStop(0.26, "rgba(245, 110, 113, 0.9)");
  large.addColorStop(0.72, "rgba(100, 46, 167, 0.5)");
  large.addColorStop(1, "rgba(100, 46, 167, 0)");
  context.fillStyle = large;
  context.beginPath();
  context.arc(490, 365, 350, 0, Math.PI * 2);
  context.fill();

  const ring = context.createLinearGradient(735, 205, 1035, 590);
  ring.addColorStop(0, "rgba(9, 81, 116, 0.8)");
  ring.addColorStop(0.62, "rgba(48, 207, 184, 0.64)");
  ring.addColorStop(1, "rgba(225, 247, 187, 0.15)");
  context.strokeStyle = ring;
  context.lineWidth = 105;
  context.lineCap = "round";
  context.beginPath();
  context.arc(850, 390, 180, -0.35, Math.PI * 1.7);
  context.stroke();
}

export function drawFixture(canvas: HTMLCanvasElement, fixture: FixtureId): void {
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");

  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  switch (fixture) {
    case "prism-gradient":
      drawMulticolorGradient(context);
      break;
    case "overlap":
      drawOverlappingShapes(context);
      break;
    case "sphere":
      drawSphere(context);
      break;
    case "hard-edges":
      drawHardEdges(context);
      break;
    case "transparent":
      drawTransparent(context);
      break;
  }
}

export function drawUploadedImage(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
): void {
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");

  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const scale = Math.min(OUTPUT_WIDTH / imageWidth, OUTPUT_HEIGHT / imageHeight);
  const width = Math.max(1, Math.round(imageWidth * scale));
  const height = Math.max(1, Math.round(imageHeight * scale));
  context.drawImage(image, (OUTPUT_WIDTH - width) / 2, (OUTPUT_HEIGHT - height) / 2, width, height);
}
