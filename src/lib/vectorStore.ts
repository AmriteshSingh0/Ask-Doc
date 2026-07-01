import fs from "fs";
import path from "path";

export interface VectorEntry {
    id: string;
    text: string;
    embedding: number[];
    source: string;
}

export const STORE_PATH = process.env.VERCEL || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "vector-store.json")
    : path.join(process.cwd(), "vector-store.json");

function loadStore(): VectorEntry[] {
    if (!fs.existsSync(STORE_PATH)) return [];

    const raw = fs.readFileSync(STORE_PATH, "utf-8");

    return JSON.parse(raw);
}

function saveStore(newEntries: VectorEntry[]): void {
    fs.writeFileSync(STORE_PATH, JSON.stringify(newEntries, null, 2))
}

export function addToStore(newEntries: VectorEntry[]): void {
    const existing = loadStore();
    const combined = [...existing, ...newEntries];
    saveStore(combined);
}


function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
}

export function searchStore(queryEmbedding: number[], topk: number = 5): VectorEntry[] {
    const store = loadStore();

    return store.map((entry) => ({
        ...entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topk);
}


export function deleteFromStore(source: string): void {
    const store = loadStore().filter((e) => e.source !== source);
    saveStore(store);
}