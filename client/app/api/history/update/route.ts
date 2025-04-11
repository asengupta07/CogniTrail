import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';
import { formatNodesForMongoDB, formatEdgesForMongoDB } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    if (!body.historyId || !body.nodes || !body.edges) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (body.nodes.length === 0 || body.edges.length === 0) {
      return NextResponse.json(
        { error: 'Nodes or edges are empty' },
        { status: 400 }
      );
    }

    // Format nodes and edges for MongoDB
    const formattedNodes = formatNodesForMongoDB(body.nodes);
    const formattedEdges = formatEdgesForMongoDB(body.edges);

    // Find and update the chat history document
    const updatedHistory = await ChatHistory.findByIdAndUpdate(
      body.historyId,
      {
        $set: {
          nodes: formattedNodes,
          edges: formattedEdges,
        }
      },
      { new: true } // Return the updated document
    );

    if (!updatedHistory) {
      return NextResponse.json(
        { error: 'Chat history not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedHistory);
  } catch (error: any) {
    console.error('Error updating chat history:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update chat history',
        details: error.message,
        validationErrors: error.errors
      },
      { status: 500 }
    );
  }
} 