async function getPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjsLib;
}

/** Extracts plain text from a PDF file entirely in the browser. Loads pdf.js lazily. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await getPdfjsLib();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}

/**
 * Renders PDF pages to canvas and returns them as base64 JPEG images.
 * Used to handle diagrams, handwriting, and image-heavy PDFs that text extraction misses.
 * Returns up to maxPages images, each scaled to a readable resolution.
 */
export async function extractPdfImages(
  file: File,
  maxPages = 6,
  scale = 1.5
): Promise<string[]> {
  const pdfjsLib = await getPdfjsLib();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: string[] = [];
  const limit = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    // Use JPEG at 85% quality — good enough for vision models, much smaller than PNG
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    // Strip the data: prefix; we only want the raw base64
    images.push(dataUrl.split(",")[1] ?? "");
  }
  return images;
}
