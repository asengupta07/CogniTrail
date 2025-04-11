import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';
import { formatNodesForMongoDB, formatEdgesForMongoDB } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    if (!body.topic || !body.nodes || !body.edges) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format nodes and edges for MongoDB
    const formattedNodes = formatNodesForMongoDB(body.nodes);
    const formattedEdges = formatEdgesForMongoDB(body.edges);

    const document = {
      topic: body.topic,
      nodes: formattedNodes,
      edges: formattedEdges,
    }
    // Create the chat history document
    const chatHistory = await ChatHistory.create(document);

    return NextResponse.json(chatHistory);
  } catch (error: any) {
    console.error('Error saving chat history:', error);
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to save chat history',
        details: error.message,
        validationErrors: error.errors
      },
      { status: 500 }
    );
  }
} 