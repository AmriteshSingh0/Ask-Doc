import { NextResponse } from "next/server";
import fs from "fs";
import { STORE_PATH } from "@/lib/vectorStore";

export async function DELETE() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            fs.unlinkSync(STORE_PATH);
        }
        return NextResponse.json({ success: true, message: "Vector store cleared." });
    } catch (error) {
        console.error("Clear error:", error);
        return NextResponse.json({ error: "Failed to clear store." }, { status: 500 });
    }
}
