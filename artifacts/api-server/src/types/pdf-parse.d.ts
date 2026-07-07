// Type declaration for the internal pdf-parse v1 library path.
// We import from this path instead of the package root to avoid the broken
// index.js, which reads a test PDF file from cwd on import.
declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
  export default pdfParse;
}
