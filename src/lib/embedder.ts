import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,

})


export async function embedText(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    })
    return response.data[0].embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
    })

    return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}