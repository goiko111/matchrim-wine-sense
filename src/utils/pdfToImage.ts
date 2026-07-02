type PdfJsLib = typeof import("pdfjs-dist");

let pdfJsPromise: Promise<PdfJsLib> | null = null;
let pdfWorkerUrl: string | null = null;

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs"),
    ]).then(([pdfjsLib, pdfjsWorker]) => {
      if (!pdfWorkerUrl) {
        pdfWorkerUrl = URL.createObjectURL(
          new Blob([pdfjsWorker.default], { type: "application/javascript" })
        );
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
};

export const convertPdfFirstPageToImageFile = async (
  file: File,
  outputName = "pdf-page.jpg"
) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo preparar el PDF para escanearlo");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("No se pudo convertir el PDF a imagen"));
    }, "image/jpeg", 0.95);
  });

  return new File([blob], outputName, { type: "image/jpeg" });
};
