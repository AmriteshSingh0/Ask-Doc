import OpenAI from "openai";
import { embedText, embedMany } from "./embedder";
import { chunkText } from "./chunker";
import { searchStore, addToStore, VectorEntry } from "./vectorStore";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function ingestDocument(text: string, filename: string): Promise<number> {
    const chunks = chunkText(text);
    const embeddings = await embedMany(chunks.map((c) => c.text));

    const entries: VectorEntry[] = chunks.map((chunk, i) => ({
        id: uuidv4(),
        text: chunk.text,
        embedding: embeddings[i],
        source: filename,
    }));
    addToStore(entries);
    return chunks.length;
}

export async function answerQuestion(question: string): Promise<{
    answer: string;
    sources: string[];
}> {
    const questionEmbedding = await embedText(question);
    const relevantChunks = searchStore(questionEmbedding, 5);
    if (relevantChunks.length === 0) {
        return {
            answer: "I couldn't find any relevant information in the uploaded documents.",
            sources: [],
        };
    }
    const context = relevantChunks
        .map((chunk, i) => `[${i + 1}] ${chunk.text}`)
        .join("\n\n");
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a helpful assistant. Answer ONLY using the context below. 
If the answer is not in the context, say "I don't have enough information to answer that."`,
            },
            {
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${question}`,
            },
        ],
    });
    const answer = response.choices[0].message.content ?? "No answer generated.";
    const sources = [...new Set(relevantChunks.map((c) => c.source))];
    return { answer, sources };
}