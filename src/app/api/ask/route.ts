import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/ragPipeline";

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();

        if (!question || typeof question !== "string" || question.trim() === "") {
            return NextResponse.json({ error: "Question is required" }, { status: 400 });
        }

        const { answer, sources } = await answerQuestion(question.trim());

        return NextResponse.json({ answer, sources });

    } catch (error) {
        console.error("Ask error:", error);
        return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }
}
