import type { ThreadsPost } from "./types";

const OUTPUT_WIDTH = 1080;
const MAX_VIDEO_SECONDS = 12;
const VIDEO_BITS_PER_SECOND = 8_000_000;
const AUDIO_BITS_PER_SECOND = 128_000;
const VIDEO_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];
const VIDEO_MIME_TYPES_WITH_AUDIO = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E,opus",
  "video/mp4;codecs=avc1,opus",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export interface RecordedVideo {
  blob: Blob;
  extension: "mp4" | "webm";
}

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

async function renderNode(
  node: HTMLElement,
  scale: number,
  backgroundColor: string,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  await waitForImages(node);

  const { domToCanvas } = await import("modern-screenshot");
  return domToCanvas(node, {
    scale,
    backgroundColor,
    timeout: 20000,
  });
}

export async function nodeToPngBlob(
  node: HTMLElement,
  background: string,
): Promise<Blob> {
  const rendered = await renderNode(node, 2, background);

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

/**
 * Renders the card with a fully transparent canvas so it can be composited on
 * top of a video frame.
 */
export async function nodeToOverlayCanvas(
  node: HTMLElement,
): Promise<HTMLCanvasElement> {
  return renderNode(node, 1, "transparent");
}

export function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  try {
    const maxWidth = 1920;
    const ratio = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

export function waitForVideoReady(
  video: HTMLVideoElement,
  timeout = 1500,
): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const finish = () => {
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", finish);
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, timeout);
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
  });
}

export function readVideoDuration(url: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    let settled = false;

    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    video.addEventListener(
      "loadedmetadata",
      () => {
        const duration = video.duration;
        finish(Number.isFinite(duration) ? duration : 0);
      },
      { once: true },
    );
    video.addEventListener("error", () => finish(0), { once: true });
    window.setTimeout(() => finish(0), 5000);

    video.src = url;
  });
}

export function readAudioDuration(url: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    let settled = false;

    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };

    audio.addEventListener(
      "loadedmetadata",
      () => {
        const duration = audio.duration;
        finish(Number.isFinite(duration) ? duration : 0);
      },
      { once: true },
    );
    audio.addEventListener("error", () => finish(0), { once: true });
    window.setTimeout(() => finish(0), 5000);

    audio.src = url;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);

  const sourceWidth = source.videoWidth;
  const sourceHeight = source.videoHeight;

  if (!sourceWidth || !sourceHeight) {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    return;
  }

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  context.drawImage(
    source,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function pickVideoMime(withAudio: boolean): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = withAudio
    ? VIDEO_MIME_TYPES_WITH_AUDIO
    : VIDEO_MIME_TYPES;
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function recordingDuration(durationHint: number): number {
  return Math.min(
    MAX_VIDEO_SECONDS,
    Math.max(
      1,
      Number.isFinite(durationHint) && durationHint > 0 ? durationHint : 6,
    ),
  );
}

export async function recordCardVideo(
  video: HTMLVideoElement,
  overlay: HTMLCanvasElement,
  durationHint: number,
  audioTrack: MediaStreamTrack | null = null,
  onRecordStart: (() => void) | null = null,
): Promise<RecordedVideo> {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    throw new Error("Video recording is not supported");
  }

  const mimeType = pickVideoMime(Boolean(audioTrack));
  if (!mimeType) throw new Error("Video recording is not supported");

  const canvas = document.createElement("canvas");
  canvas.width = overlay.width;
  canvas.height = overlay.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const duration = recordingDuration(durationHint);

  const wasLoop = video.loop;
  const wasTime = video.currentTime;
  const wasPaused = video.paused;
  video.loop = false;

  let stream: MediaStream | null = null;

  try {
    video.currentTime = 0;
    await video.play().catch(() => undefined);

    drawCover(context, video, canvas.width, canvas.height);
    context.drawImage(overlay, 0, 0);

    stream = canvas.captureStream(30);
    if (audioTrack) stream.addTrack(audioTrack);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });

    const chunks: BlobPart[] = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.addEventListener(
        "error",
        () => reject(new Error("Could not record the video")),
        { once: true },
      );
    });

    onRecordStart?.();
    recorder.start();
    const startedAt = performance.now();

    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        resolve();
      };

      const draw = () => {
        if (finished) return;

        const elapsed = (performance.now() - startedAt) / 1000;
        drawCover(context, video, canvas.width, canvas.height);
        context.drawImage(overlay, 0, 0);

        if (elapsed >= duration || video.ended) {
          finish();
          return;
        }

        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(draw);
        } else {
          window.requestAnimationFrame(draw);
        }
      };

      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(draw);
      } else {
        window.requestAnimationFrame(draw);
      }

      window.setTimeout(finish, duration * 1000 + 750);
    });

    recorder.stop();
    await stopped;

    const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

    return {
      blob: new Blob(chunks, { type: mimeType.split(";")[0] }),
      extension,
    };
  } finally {
    stream?.getVideoTracks().forEach((track) => track.stop());
    video.loop = wasLoop;
    video.currentTime = wasTime;
    if (!wasPaused) {
      void video.play().catch(() => undefined);
    }
  }
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
  extension = "png",
): string {
  const username =
    post.author.username.replace(/[^a-z0-9._-]/gi, "").slice(0, 30) ||
    "threads";
  const base = `threadcard-${username}-${post.shortcode}`;
  return `${base}${total > 1 ? `-${index + 1}` : ""}.${extension}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
