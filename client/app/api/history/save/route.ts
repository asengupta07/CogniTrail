import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import ChatHistory from "@/models/ChatHistory";
import { formatNodesForMongoDB, formatEdgesForMongoDB } from "@/lib/utils";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.topic || !body.nodes || !body.edges) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format nodes and edges for MongoDB
    const formattedNodes = formatNodesForMongoDB(body.nodes);
    const formattedEdges = formatEdgesForMongoDB(body.edges);

    const document = {
      userId: session.user.id,
      topic: body.topic,
      nodes: formattedNodes,
      edges: formattedEdges,
    };
    // Create the chat history document
    const chatHistory = await ChatHistory.create(document);

    return NextResponse.json(chatHistory);
  } catch (error: any) {
    console.error("Error saving chat history:", error);

    // Return more detailed error information
    return NextResponse.json(
      {
        error: "Failed to save chat history",
        details: error.message,
        validationErrors: error.errors,
      },
      { status: 500 }
    );
  }
}
