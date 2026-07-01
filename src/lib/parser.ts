export async function parsePDF(fileBuffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");

  const fn = typeof pdfParse === "function" ? pdfParse : pdfParse.default;
  const data = await fn(fileBuffer);

  const cleanText = data.text
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleanText;
}
