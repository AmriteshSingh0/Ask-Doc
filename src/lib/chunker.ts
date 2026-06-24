export interface TextChunk {
    text: string;
    index: number;
}

export function chuckText(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200

): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end).trim();

        if (chunk.length > 50) {
            chunks.push({ text: chunk, index });
            index++;
        }
        start += chunkSize - overlap;
    }
    return chunks;

}