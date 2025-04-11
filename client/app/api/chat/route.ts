import { NextRequest, NextResponse } from "next/server";
import { getChatResponse } from "@/functions/getChatResponse";

export async function POST(request: NextRequest) {
    const { query, chatHistory, nodeTitle } = await request.json();
    const response = await getChatResponse(query, chatHistory, nodeTitle);
    return NextResponse.json({ response });
}