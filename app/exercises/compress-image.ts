// 写真は長い辺を 1200px までにして JPEG で軽くする（ブラウザの中で動かす）
const PHOTO_MAX_SIDE = 1200;
const PHOTO_QUALITY = 0.8;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas is not supported");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      PHOTO_QUALITY,
    );
  });
}
