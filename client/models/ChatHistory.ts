import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  },
  data: {
    type: {
      label: String,
      summary: String,
      isRoot: Boolean,
      isLoading: Boolean,
      isExploring: Boolean,
      parentTitle: String,
      parentSummary: String,
    },
    required: true,
  },
});

const edgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  animated: {
    type: Boolean,
    required: true,
  },
  sourceHandle: {
    type: String,
  },
  targetHandle: {
    type: String,
  },
  markerEnd: {
    type: Object,
  },
  style: {
    type: Object,
  },
});

const ChatHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  topic: {
    type: String,
    required: true,
  },
  nodes: {
    type: [nodeSchema],
    required: true,
  },
  edges: {
    type: [edgeSchema],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const ChatHistory =
  mongoose.models.ChatHistory ||
  mongoose.model("ChatHistory", ChatHistorySchema);

export default ChatHistory;
