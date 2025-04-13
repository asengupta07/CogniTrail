import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatHistory from "@/models/ChatHistory";
import { authOptions } from "../auth/[...nextauth]/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const histories = await ChatHistory.find({ userId: session.user.id })
      .sort({ date: -1 })
      .exec();

    return NextResponse.json(histories);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
