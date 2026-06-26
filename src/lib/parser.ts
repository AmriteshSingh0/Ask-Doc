export async function parsePDF(filebuffer: Buffer): Promise<string> {
    const pdfParse = require("pdf-parse");


    const data = await pdfParse(filebuffer);

    const cleanText = data.text.replace(/\n{3,}/g, "\n\n").trim();

    return cleanText;
}