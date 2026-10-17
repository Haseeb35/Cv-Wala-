/** Crops an uploaded photo to a centred circle (transparent PNG) small enough to store. */
export async function toCirclePhoto(file: File, size = 360): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened. Try a JPG or PNG."));
      i.src = url;
    });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    // Faces usually sit in the upper half of portrait photos.
    const sx = (img.naturalWidth - s) / 2;
    const sy = img.naturalHeight > img.naturalWidth ? (img.naturalHeight - s) * 0.25 : 0;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
