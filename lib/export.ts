import type { ThreadsPost } from "./types";

const OUTPUT_WIDTH = 1080;

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export async function nodeToPngBlob(
  node: HTMLElement,
  background: string,
): Promise<Blob> {
  await document.fonts.ready;
  await waitForImages(node);

  const { domToCanvas } = await import("modern-screenshot");
  const rendered = await domToCanvas(node, {
    scale: 2,
    backgroundColor: background,
    timeout: 20000,
  });

  const output = document.createElement("canvas");
  output.width = OUTPUT_WIDTH;
  output.height = Math.max(1, Math.round(rendered.height / 2));

  const context = output.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  context.drawImage(rendered, 0, 0, output.width, output.height);

  return new Promise<Blob>((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode PNG"));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function copyBlob(blob: Blob): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function slideFilename(
  post: ThreadsPost,
  index: number,
  total: number,
): string {
  const username =
    post.author.username.replace(/[^a-z0-9._-]/gi, "").slice(0, 30) ||
    "threads";
  const base = `threadcard-${username}-${post.shortcode}`;
  return `${base}${total > 1 ? `-${index + 1}` : ""}.png`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
