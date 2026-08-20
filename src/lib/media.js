export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const cropImage = (file, crop, shape = "square") =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 700;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (shape === "circle") {
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.clip();
      }
      const base = Math.max(size / image.width, size / image.height);
      const scale = base * crop.zoom;
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (size - width) / 2 + (crop.x / 100) * size;
      const y = (size - height) / 2 + (crop.y / 100) * size;
      context.drawImage(image, x, y, width, height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
