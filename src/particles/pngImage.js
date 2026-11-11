export function decodePng(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}
