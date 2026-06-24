export async function parsePDF(filebuffer: Buffer): Promise<string> {
    const pdfParse = require("pdf-parse");


    const data = await pdfParse(filebuffer);

    const cleanText = data.text.replace(/[^a-zA-Z0-9\s.,!\n]/g, "").trim();
    return cleanText;
}