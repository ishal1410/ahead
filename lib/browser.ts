// Browser-only image helpers (canvas). Kept apart from lib/passport.ts so that
// file stays testable in node.

import { averageHex } from "./color";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image couldn't be read. Please try another photo."));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export function toJpegDataUrl(img: HTMLImageElement, maxSide: number, quality = 0.86): string {
  return drawScaled(img, maxSide).toDataURL("image/jpeg", quality);
}

export function toJpegBlob(img: HTMLImageElement, maxSide: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    drawScaled(img, maxSide).toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the photo."))), "image/jpeg", 0.92),
  );
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

// Average a 9x9 patch around each point given as fractions (0-1) of the image.
function samplePatches(img: HTMLImageElement, pts: [number, number][]): string[] {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return pts.map(([fx, fy]) => {
    const x = Math.min(c.width - 9, Math.max(0, Math.round(fx * c.width) - 4));
    const y = Math.min(c.height - 9, Math.max(0, Math.round(fy * c.height) - 4));
    return averageHex(ctx.getImageData(x, y, 9, 9).data);
  });
}

export const samplePatch = (img: HTMLImageElement, fx: number, fy: number) => samplePatches(img, [[fx, fy]])[0];

// The photo's background: patches along the top and the upper sides (the lower
// edges are usually clothes, the top middle is usually hair).
const EDGE_POINTS: [number, number][] = [
  [0.03, 0.03], [0.2, 0.02], [0.8, 0.02], [0.97, 0.03],
  [0.02, 0.2], [0.98, 0.2], [0.02, 0.4], [0.98, 0.4],
];
export const edgeSamples = (img: HTMLImageElement) => samplePatches(img, EDGE_POINTS);

export function downloadText(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Radiogroup keys (WAI-ARIA): arrows move and wrap, Home/End jump. -1 = not ours.
export function radioKeyIndex(key: string, i: number, n: number): number {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n;
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return -1;
}
