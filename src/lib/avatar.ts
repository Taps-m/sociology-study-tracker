/**
 * Turning a phone photograph into something small enough to keep.
 *
 * A modern phone camera produces four or five megabytes. localStorage gives you
 * about five in total, shared with the entire event log, so the file cannot be
 * stored as it arrives. It is drawn onto a canvas at avatar size, square-cropped
 * from the centre, and re-encoded as JPEG — which lands around 6 kB for a face
 * at 128px, small enough that the photo is never the reason a save fails.
 */

/** Rendered at 128 so it stays sharp on a 2× display at its 28px box. */
const SIZE = 128;
const QUALITY = 0.82;

export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That is not an image.");
  }

  const bitmap = await loadBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);

  if ("close" in bitmap) (bitmap as ImageBitmap).close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}

/**
 * createImageBitmap where it exists — it decodes off the main thread and
 * respects EXIF orientation, so a photo taken in portrait does not arrive on
 * its side. An <img> is the fallback for older Safari.
 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}
