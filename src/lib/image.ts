// Fotoğrafı cihazda küçültüp JPEG base64'e çevirir — hız ve bedava API limiti için.
export interface DownscaledImage {
  base64: string; // ham base64 (data: öneki olmadan)
  mime: string;
}

export function fileToDownscaledBase64(file: File, maxDim = 1024, quality = 0.8): Promise<DownscaledImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas desteklenmiyor"));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: dataUrl.split(",")[1], mime: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görüntü okunamadı"));
    };
    img.src = url;
  });
}
