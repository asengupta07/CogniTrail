import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatHistory from "@/models/ChatHistory";
import { authOptions } from "../../auth/[...nextauth]/config";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, nodes, edges } = await request.json();

    if (!topic || !nodes || !edges) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const newHistory = await ChatHistory.create({
      userId: session.user.id,
      topic,
      nodes,
      edges,
      date: new Date(),
    });

    return NextResponse.json(newHistory);
  } catch (error) {
    console.error("Error saving chat history:", error);
    return NextResponse.json(
      { error: "Failed to save chat history" },
      { status: 500 }
    );
  }
}
