import { NextRequest, NextResponse } from "next/server";
import { parsePDF } from "@/lib/parser";
import { ingestDocument } from "@/lib/ragPipeline";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!file.name.endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "File too large. Maximum allowed size is 5MB." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const text = await parsePDF(buffer);

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
        }
        const chunkCount = await ingestDocument(text, file.name);

        return NextResponse.json({
            success: true,
            filename: file.name,
            chunks: chunkCount,
            message: `Successfully processed ${chunkCount} chunks from "${file.name}"`,
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }
}
