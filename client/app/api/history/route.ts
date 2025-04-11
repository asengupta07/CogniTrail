import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

export async function GET() {
  try {
    await connectDB();
    const chatHistory = await ChatHistory.find()
      .sort({ date: -1 })
      .limit(10);

    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
} 