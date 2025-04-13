"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type EdgeTypes,
  type XYPosition,
  BezierEdge,
  Handle,
  Position,
  Panel,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  MessageSquare,
  LogOut,
  User,
  Sparkles,
  X,
  Trash2,
} from "lucide-react";
import { ZoomSlider } from "@/components/zoom-slider";
import { formatDate } from "@/lib/utils";
import { ChatModal } from "@/components/chat-modal";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PlaceholderNode } from "@/components/placeholder-node";

interface TreeData {
  title: string;
  summary: string;
  keywords: string[];
  parentTitle?: string;
  parentSummary?: string;
}

interface CustomNodeData {
  label: string;
  summary?: string;
  isRoot?: boolean;
  onGenerate?: () => void;
  isLoading?: boolean;
  onLearnMore?: () => void;
  isExploring?: boolean;
  parentTitle?: string;
  parentSummary?: string;
  onDelete?: () => void;
}

interface ChatHistory {
  _id: string;
  topic: string;
  date: string;
  nodes: Node[];
  edges: Edge[];
}

const CustomNode = ({ data }: { data: CustomNodeData }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className={`p-6 rounded-xl shadow-lg backdrop-blur-md relative ${
        data.isRoot
          ? "bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500 text-white w-[800px] border border-white/20"
          : "bg-white/10 border border-white/30 hover:border-cyan-300/70 hover:shadow-cyan-100/50 max-w-[800px]"
      }`}
      style={{
        boxShadow: data.isRoot
          ? "0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.2)"
          : "0 0 15px rgba(6, 182, 212, 0.2)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10 }}
        className="border-2 border-cyan-300 bg-white"
      />
      {!data.isRoot && data.onDelete && !data.summary && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={data.onDelete}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors"
          title="Delete node"
        >
          <Trash2 size={16} />
        </motion.button>
      )}
      <div className={`flex justify-between items-start ${
        !data.summary && "pe-4"
      }`}>
        <div
          className={`font-bold text-lg mb-3 ${
            data.isRoot ? "text-white" : "text-white"
          }`}
        >
          {data.label}
        </div>
      </div>
      {data.summary && (
        <div
          className={`text-sm mb-3 ${
            data.isRoot ? "text-white/90" : "text-white/80"
          }`}
        >
          {data.summary}
        </div>
      )}
      <div className="flex gap-2">
        {!data.isRoot && data.onGenerate && (
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white text-sm rounded-lg 
                      hover:from-cyan-600 hover:to-fuchsia-700 shadow-md flex items-center gap-2
                      disabled:opacity-70 disabled:cursor-not-allowed border border-white/20 backdrop-blur-md"
            onClick={data.onGenerate}
            disabled={data.isLoading || data.isExploring}
          >
            {data.isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Exploring...
              </>
            ) : (
              <>
                <Sparkles size={16} className="animate-pulse" />
                Explore
              </>
            )}
          </motion.button>
        )}
        {data.summary && data.onLearnMore && (
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm rounded-lg 
                      hover:from-emerald-600 hover:to-teal-700 shadow-md flex items-center gap-2
                      border border-white/20 backdrop-blur-md"
            onClick={data.onLearnMore}
          >
            <MessageSquare size={16} />
            Learn More
          </motion.button>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10 }}
        className="border-2 border-cyan-300 bg-white"
      />
    </motion.div>
  );
};

const nodeTypes = {
  custom: CustomNode,
  placeholder: PlaceholderNode,
};

const edgeTypes: EdgeTypes = {
  bezier: BezierEdge,
};

export default function LearningTree() {
  const [showModal, setShowModal] = useState(true);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [nodes, setNodes, onNodesState] = useNodesState([]);
  const [edges, setEdges, onEdgesState] = useEdgesState([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [currentNodeTitle, setCurrentNodeTitle] = useState("");
  const nodeId = useRef(0);
  const nodesRef = useRef<Node[]>([]);
  const historyUpdateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status } = useSession();
  const [showNodeNameModal, setShowNodeNameModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [selectedParentNode, setSelectedParentNode] = useState<Node | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<XYPosition | null>(null);
  const [clickedPlaceholderId, setClickedPlaceholderId] = useState<string | null>(null);

  // Update the ref whenever nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Fetch chat history (dummy implementation)
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to fetch chat history");
        }
        const data = await response.json();
        if (data.length === 0) setChatHistory([]);
        else {
          setChatHistory(data);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, []);

  const getNextId = (parentId?: string) => {
    nodeId.current += 1;
    return parentId
      ? `${parentId}-${nodeId.current}`
      : `node-${nodeId.current}`;
  };

  const resetNodeIds = () => {
    nodeId.current = 0;
  };

  const nodeHeight = 40;
  const MIN_HORIZONTAL_SPACING = 2000; // Minimum spacing between nodes
  const verticalSpacing = 300;
  const NODE_WIDTH = 200; // Base width for non-root nodes
  const ROOT_NODE_WIDTH = 500; // Width for root nodes
  const COLLISION_THRESHOLD = 300; // Minimum distance between nodes
  const COLLISION_RESOLUTION = 1000; // How far to move a node when collision is detected

  const calculateNodeWidth = (node: Node) => {
    return node.data.isRoot ? ROOT_NODE_WIDTH : NODE_WIDTH;
  };

  const calculateSubtreeHeight = (data: TreeData): number => {
    // Base height for the current node
    let height = nodeHeight;

    // If this node has children, add their heights plus spacing
    if (data.keywords && data.keywords.length > 0) {
      height +=
        data.keywords.length * (nodeHeight + verticalSpacing) - verticalSpacing;
    }

    return height;
  };

  const checkNodeCollision = (
    position: XYPosition,
    existingNodes: Node[]
  ): boolean => {
    return existingNodes.some((node) => {
      const dx = Math.abs(position.x - node.position.x);
      const dy = Math.abs(position.y - node.position.y);
      return dx < COLLISION_THRESHOLD && dy < COLLISION_THRESHOLD;
    });
  };

  const resolveCollision = (
    position: XYPosition,
    existingNodes: Node[]
  ): XYPosition => {
    let newX = position.x;
    while (checkNodeCollision({ x: newX, y: position.y }, existingNodes)) {
      newX += COLLISION_RESOLUTION;
    }
    return { x: newX, y: position.y };
  };

  const handleLearnMore = (nodeTitle: string) => {
    setCurrentNodeTitle(nodeTitle);
    setChatModalOpen(true);
  };

  const handleDeleteNode = (nodeId: string) => {
    // Find all nodes that need to be deleted (the node and its children)
    const nodesToDelete = new Set<string>();
    const edgesToDelete = new Set<string>();
    
    // Add the node itself
    nodesToDelete.add(nodeId);
    
    // Find all edges connected to this node
    const connectedEdges = edges.filter(edge => 
      edge.source === nodeId || edge.target === nodeId
    );
    
    // Add all connected edges to delete set
    connectedEdges.forEach(edge => {
      edgesToDelete.add(edge.id);
      
      // If this is a source edge, add the target node to delete set
      if (edge.source === nodeId) {
        nodesToDelete.add(edge.target);
      }
    });
    
    // Update nodes and edges
    setNodes(nds => nds.filter(node => !nodesToDelete.has(node.id)));
    setEdges(eds => eds.filter(edge => !edgesToDelete.has(edge.id)));
    
    // Update history if needed
    if (currentHistoryId) {
      updateHistory(
        currentHistoryId,
        nodes.filter(node => !nodesToDelete.has(node.id)),
        edges.filter(edge => !edgesToDelete.has(edge.id))
      );
    }
  };

  const convertToReactFlowElements = (
    data: TreeData,
    position: XYPosition = { x: 0, y: 0 },
    depth = 0,
    parentId?: string
  ): { nodes: Node[]; edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create root node
    const rootNode: Node = {
      id: parentId || "root",
      type: "custom",
      position,
      data: {
        label: data.title,
        summary: data.summary,
        isRoot: !parentId,
        onLearnMore: data.summary
          ? () => handleLearnMore(data.title)
          : undefined,
        parentTitle: data.parentTitle,
        parentSummary: data.parentSummary,
      },
    };
    nodes.push(rootNode);

    // Calculate parent node width
    const parentWidth = calculateNodeWidth(rootNode);

    // Create child nodes and edges
    const childrenCount = data.keywords.length;
    if (childrenCount > 0) {
      // Calculate total height needed for all children
      const totalChildHeight =
        childrenCount * (nodeHeight + verticalSpacing) - verticalSpacing;
      const startY = position.y - totalChildHeight / 2;

      data.keywords.forEach((keyword, index) => {
        let childPosition: XYPosition = {
          x: position.x + parentWidth + MIN_HORIZONTAL_SPACING,
          y: startY + index * (nodeHeight + verticalSpacing),
        };

        // Check for collisions with existing nodes and resolve if needed
        if (nodesRef.current.length > 0) {
          childPosition = resolveCollision(childPosition, nodesRef.current);
        }

        const childNodeId = getNextId(rootNode.id);
        const childNode: Node = {
          id: childNodeId,
          type: "custom",
          position: childPosition,
          data: {
            label: keyword,
            onGenerate: () =>
              generateTreeForNode(
                childNodeId,
                keyword,
                data.title,
                data.summary
              ),
            isExploring: isExploring,
            parentTitle: data.title,
            parentSummary: data.summary,
            onDelete: () => handleDeleteNode(childNodeId),
          },
        };

        nodes.push(childNode);

        const edge: Edge = {
          id: `edge-${rootNode.id}-${childNodeId}`,
          source: rootNode.id,
          target: childNodeId,
          type: "bezier",
          animated: true,
          sourceHandle: "source",
          targetHandle: "target",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#06b6d4",
          },
          style: {
            stroke: "url(#gradient)",
            strokeWidth: 3,
          },
        };

        edges.push(edge);
      });

      // Add placeholder node
      const placeholderPosition: XYPosition = {
        x: position.x + parentWidth + MIN_HORIZONTAL_SPACING,
        y: startY + childrenCount * (nodeHeight + verticalSpacing),
      };

      const placeholderNodeId = getNextId(rootNode.id);
      const placeholderNode: Node = {
        id: placeholderNodeId,
        type: "placeholder",
        position: placeholderPosition,
        data: {},
      };

      nodes.push(placeholderNode);

      const placeholderEdge: Edge = {
        id: `edge-${rootNode.id}-${placeholderNodeId}`,
        source: rootNode.id,
        target: placeholderNodeId,
        type: "bezier",
        animated: true,
        sourceHandle: "source",
        targetHandle: "target",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "#06b6d4",
        },
        style: {
          stroke: "url(#gradient)",
          strokeWidth: 3,
        },
      };

      edges.push(placeholderEdge);
    }

    return { nodes, edges };
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "bezier",
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#06b6d4",
            },
            style: {
              stroke: "url(#gradient)",
              strokeWidth: 3,
            },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Function to update history (now uses useCallback and takes arguments)
  const updateHistory = useCallback(
    async (historyId: string, nodesToSave: Node[], edgesToSave: Edge[]) => {
      if (!historyId) return; // Safety check

      try {
        console.log(`Attempting to update history ${historyId}`);
        const response = await fetch("/api/history/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            historyId,
            nodes: nodesToSave,
            edges: edgesToSave,
          }),
        });

        if (response.status === 400) {
          console.log("Nodes or edges are empty, skipping update");
          return;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          if (errorBody.includes("Nodes or edges are empty")) {
            console.log("Nodes or edges are empty, skipping update");
          } else {
            throw new Error(
              `Failed to update chat history: ${response.status} ${errorBody}`
            );
          }
        }

        // Update local chat history state optimistically
        setChatHistory((prev) =>
          prev.map((item) =>
            item._id === historyId
              ? { ...item, nodes: nodesToSave, edges: edgesToSave }
              : item
          )
        );
        console.log(`History ${historyId} updated successfully locally.`);
      } catch (err) {
        // Make sure 'err' is typed correctly if needed, e.g., catch (err: any)
        console.error("Error updating history:", err);
        setError(
          `Failed to save changes: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    },
    [setChatHistory, setError]
  ); // Added setError dependency

  const generateTreeForNode = async (
    parentNodeId: string,
    topic: string,
    parentNodeTopic: string,
    parentNodeSummary: string
  ) => {
    if (isExploring) return; // Prevent multiple explorations
    setIsExploring(true);
    setLoading(true);
    setError(null);

    try {
      console.log("Generating for node:", parentNodeId);
      console.log("Current nodes:", nodes);
      console.log("Current edges:", edges);

      // Find the parent node's topic by looking at the edges

      console.log("parent node topic: ", parentNodeTopic);
      console.log("parent node summary: ", parentNodeSummary);

      const response = await fetch("/api/initTree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          parentTopic: parentNodeTopic,
          parentSummary: parentNodeSummary,
          keepTopic: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data: TreeData = await response.json();

      const parentNode = nodesRef.current.find((n) => n.id === parentNodeId);

      console.log("parent node: ", parentNode);

      // Get the parent node's position from the ref
      const parentNodePosition = parentNode?.position;

      if (!parentNodePosition) {
        throw new Error("Parent node position not found");
      }

      // Convert the data to ReactFlow elements starting from parent position
      const { nodes: newNodes, edges: newEdges } = convertToReactFlowElements(
        {
          ...data,
          parentTitle: parentNodeTopic,
          parentSummary: parentNodeSummary,
        },
        parentNodePosition,
        1,
        parentNodeId
      );

      // Update the parent node with summary and remove loading state
      const updatedParentNode = {
        ...parentNode,
        data: {
          ...parentNode.data,
          summary: data.summary,
          onGenerate: undefined,
          isLoading: false,
          onLearnMore: () => handleLearnMore(data.title),
          parentTitle: data.parentTitle,
          parentSummary: data.parentSummary,
        },
      };

      // Set the nodes and edges with animation delay
      setTimeout(() => {
        let finalNodes: Node[] = [];
        setNodes((nds) => {
          const filteredNodes = nds.filter((n) => n.id !== parentNodeId);
          finalNodes = [
            ...filteredNodes,
            updatedParentNode,
            ...newNodes.filter((n) => n.id !== parentNodeId),
          ];
          return finalNodes;
        });

        let finalEdges: Edge[] = [];
        setEdges((eds) => {
          finalEdges = [...eds, ...newEdges];
          return finalEdges;
        });

        // Update history after state updates are likely processed
        setTimeout(() => {
          if (currentHistoryId) {
            updateHistory(currentHistoryId, finalNodes, finalEdges);
          }
        }, 0);
      }, 300);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to generate the learning tree. Please try again.");
      // Reset loading state on error
      setNodes((nds) =>
        nds.map((node) =>
          node.id === parentNodeId
            ? { ...node, data: { ...node.data, isLoading: false } }
            : node
        )
      );
    } finally {
      setLoading(false);
      setIsExploring(false); // Reset exploration state
    }
  };

  const handleGenerateTree = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic to learn about");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Reset node IDs when generating a new tree
      resetNodeIds();

      const response = await fetch("/api/initTree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data: TreeData = await response.json();

      // Convert the data to ReactFlow elements
      const { nodes, edges } = convertToReactFlowElements(data);

      // Save to chat history
      const saveResponse = await fetch("/api/history/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          nodes,
          edges,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save chat history");
      }

      // Update local chat history
      const newHistoryItem = await saveResponse.json();
      setChatHistory((prev) => [newHistoryItem, ...prev]);
      setCurrentHistoryId(newHistoryItem._id); // Set the current history ID

      // Close modal and set the nodes and edges
      setShowModal(false);
      setNodes(nodes);
      setEdges(edges);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to generate the learning tree. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGenerateTree();
    }
  };

  const loadHistoryItem = async (historyId: string) => {
    try {
      const historyItem = chatHistory.find((item) => item._id === historyId);
      if (!historyItem) return;

      setTopic(historyItem.topic);

      // Add onGenerate function to unexplored nodes
      const nodesWithGenerate = historyItem.nodes.map((node) => {
        // A node is unexplored if it has no summary and is not the root node
        const isUnexplored = !node.data.summary && !node.data.isRoot;
        return {
          ...node,
          data: {
            ...node.data,
            onGenerate: isUnexplored
              ? () =>
                  generateTreeForNode(
                    node.id,
                    node.data.label,
                    node.data.parentTitle,
                    node.data.parentSummary
                  )
              : undefined,
            onLearnMore: node.data.summary
              ? () => handleLearnMore(node.data.label)
              : undefined,
            isExploring: isExploring,
            parentTitle: node.data.parentTitle,
            parentSummary: node.data.parentSummary,
          },
        };
      });

      setNodes(nodesWithGenerate);
      setEdges(historyItem.edges);
      setShowModal(false);
      setCurrentHistoryId(historyItem._id); // Set the current history ID when loading
    } catch (error) {
      console.error("Error loading history item:", error);
      setError("Failed to load history item");
    }
  };

  // useEffect to automatically update history on node/edge changes with debounce
  useEffect(() => {
    if (currentHistoryId) {
      // Nodes or edges changed while viewing a specific history item
      if (historyUpdateDebounceTimerRef.current) {
        clearTimeout(historyUpdateDebounceTimerRef.current);
      }
      console.log(
        "Change detected, scheduling history update for:",
        currentHistoryId
      ); // Add log
      historyUpdateDebounceTimerRef.current = setTimeout(() => {
        console.log(
          "Debounced timer fired. Updating history for:",
          currentHistoryId
        ); // Add log
        // Pass the current state values and the ID
        // 'nodes' and 'edges' here will be the latest state values when the timeout executes
        updateHistory(currentHistoryId, nodes, edges);
      }, 1500); // Use 1.5 seconds debounce
    }

    return () => {
      // Cleanup timer on unmount or before next run
      if (historyUpdateDebounceTimerRef.current) {
        // console.log("Cleaning up debounce timer"); // Optional log
        clearTimeout(historyUpdateDebounceTimerRef.current);
      }
    };
  }, [nodes, edges, currentHistoryId, updateHistory]); // Dependencies

  // Add this function to filter chat history based on search term
  const filteredChatHistory = chatHistory.filter((item) =>
    item.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add this component for the user profile section
  const UserProfile = ({ session }: { session: any }) => {
    return (
      <div className="p-4 border-t border-gray-200/10 mt-auto backdrop-blur-md bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <Image
              src={session.user.image || "/placeholder.svg"}
              alt={session.user.name || "User"}
              width={40}
              height={40}
              className="rounded-full border-2 border-cyan-300/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {session.user.name}
            </p>
            <p className="text-sm text-white/70 truncate">
              {session.user.email}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => signOut()}
            className="p-2 hover:bg-white/10 rounded-full flex-shrink-0 backdrop-blur-sm"
            title="Sign out"
          >
            <LogOut className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    );
  };

  // Add this new function to handle node creation
  const handleNodeCreate = (placeholderId: string, position: XYPosition) => {
    // Find the edge connected to this placeholder to find the parent
    const parentEdge = edges.find((e) => e.target === placeholderId);
    if (!parentEdge) {
      console.error("Could not find parent edge for placeholder:", placeholderId);
      return;
    }
    const parentNode = nodes.find((n) => n.id === parentEdge.source);
    if (!parentNode) {
      console.error("Could not find parent node for placeholder:", placeholderId);
      return;
    }

    setSelectedParentNode(parentNode); // This is the actual parent
    setSelectedPosition(position);     // Position for the new node
    setClickedPlaceholderId(placeholderId); // Store the ID of the placeholder we clicked
    setShowNodeNameModal(true);
  };

  const handleNodeNameSubmit = () => {
    if (
      !selectedParentNode ||
      !selectedPosition ||
      !newNodeName.trim() ||
      !clickedPlaceholderId
    )
      return;

    const newNodeId = getNextId(selectedParentNode.id);
    const newNode: Node = {
      id: newNodeId,
      type: "custom",
      position: selectedPosition,
      data: {
        label: newNodeName,
        onGenerate: () =>
          generateTreeForNode(
            newNodeId,
            newNodeName,
            selectedParentNode.data.label,
            selectedParentNode.data.summary
          ),
        isExploring: isExploring,
        parentTitle: selectedParentNode.data.label,
        parentSummary: selectedParentNode.data.summary,
        onDelete: () => handleDeleteNode(newNodeId),
      },
    };

    // Edge from parent to the new node
    const newEdge: Edge = {
      id: `edge-${selectedParentNode.id}-${newNodeId}`,
      source: selectedParentNode.id,
      target: newNodeId,
      type: "bezier",
      animated: true,
      sourceHandle: "source",
      targetHandle: "target",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "#06b6d4",
      },
      style: {
        stroke: "url(#gradient)",
        strokeWidth: 3,
      },
    };

    // Position for the new placeholder (below the new node)
    const placeholderPosition: XYPosition = {
      x: selectedPosition.x,
      y: selectedPosition.y + nodeHeight + verticalSpacing,
    };

    const placeholderNodeId = getNextId(selectedParentNode.id); // Generate ID based on parent
    const placeholderNode: Node = {
      id: placeholderNodeId,
      type: "placeholder",
      position: placeholderPosition,
      data: {},
    };

    // Edge from PARENT to the NEW placeholder
    const placeholderEdge: Edge = {
      id: `edge-${selectedParentNode.id}-${placeholderNodeId}`,
      source: selectedParentNode.id, // Connect to the PARENT
      target: placeholderNodeId,
      type: "bezier",
      animated: true,
      sourceHandle: "source",
      targetHandle: "target",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "#06b6d4",
      },
      style: {
        stroke: "url(#gradient)",
        strokeWidth: 3,
      },
    };

    setNodes((nds) => [
      ...nds.filter((n) => n.id !== clickedPlaceholderId), // Remove old placeholder node
      newNode,
      placeholderNode,
    ]);
    setEdges((eds) => [
      ...eds.filter((e) => e.target !== clickedPlaceholderId), // Remove old placeholder edge
      newEdge,
      placeholderEdge,
    ]);

    // Reset state
    setShowNodeNameModal(false);
    setNewNodeName("");
    setSelectedParentNode(null);
    setSelectedPosition(null);
    setClickedPlaceholderId(null);
  };

  // Add authentication check before the main content
  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black overflow-hidden">
      {/* SVG Gradient Definition for Edges */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>

      {/* Chat History Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-80 h-full bg-black/30 backdrop-blur-xl border-r border-white/10 shadow-[0_0_25px_rgba(6,182,212,0.2)] z-10 flex flex-col"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  History
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 backdrop-blur-sm"
                >
                  <ChevronLeft size={20} className="text-white" />
                </motion.button>
              </div>
              <div className="mt-4 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/5 backdrop-blur-md text-white placeholder-white/50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto h-[calc(100%-80px)]">
              {filteredChatHistory.map((item) => (
                <motion.div
                  key={item._id}
                  whileHover={{
                    backgroundColor: "rgba(6, 182, 212, 0.1)",
                    boxShadow: "0 0 15px rgba(6, 182, 212, 0.2)",
                  }}
                  className="p-4 border-b border-white/10 cursor-pointer transition-all duration-300"
                  onClick={() => {
                    loadHistoryItem(item._id);
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm">
                      <Clock size={16} className="text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{item.topic}</h3>
                      <p className="text-xs text-white/60 mt-1">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {session && <UserProfile session={session} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Toggle Sidebar Button (when closed) */}
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{
              scale: 1.1,
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.5)",
            }}
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-black/50 text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <ChevronRight size={20} />
          </motion.button>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1 w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesState}
            onEdgesChange={onEdgesState}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultEdgeOptions={{
              type: "bezier",
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: "#06b6d4",
              },
              style: {
                stroke: "url(#gradient)",
                strokeWidth: 3,
              },
            }}
            style={{ background: "transparent" }}
            minZoom={0.1}
            maxZoom={3}
            defaultViewport={{ x: 0, y: 0, zoom: 2 }}
            attributionPosition="bottom-right"
            onNodeClick={(event, node) => {
              if (node.type === "placeholder") {
                handleNodeCreate(node.id, node.position);
              }
            }}
          >
            <Controls className="bg-white/30 backdrop-blur-xl shadow-lg rounded-lg border border-white/20 text-purple-400" />
            <Background
              color="#06b6d4"
              gap={24}
              size={1.5}
              variant={BackgroundVariant.Dots}
              className="bg-gradient-to-br from-gray-900 to-black"
            />
            <ZoomSlider position="bottom-right" />
            <Panel
              position="top-center"
              className="bg-black/30 backdrop-blur-xl p-2 sm:p-3 rounded-lg shadow-lg border border-white/20"
            >
              <h1 className="text-md sm:text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-center">
                CogniTrail Explorer
              </h1>
            </Panel>
            <Panel
              position="bottom-center"
              className="bg-black/30 backdrop-blur-xl p-1.5 sm:p-2 rounded-lg shadow-lg border border-white/20"
            >
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white rounded-lg 
                          shadow-lg flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base border border-white/20"
              >
                <Search size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                <span className="hidden sm:inline">Explore New Topic</span>
                <span className="sm:hidden">Explore</span>
              </motion.button>
            </Panel>
          </ReactFlow>
        </div>

        {/* Topic Input Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="bg-black/50 backdrop-blur-xl rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] p-4 sm:p-8 max-w-2xl w-full relative border border-white/20"
              >
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>

                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text mb-1 sm:mb-2">
                    Generate a CogniTrail Map
                  </h2>
                  <p className="text-sm sm:text-base text-white/80">
                    Enter a topic you want to explore, and have fun going down
                    the rabbit hole!
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Machine Learning, Quantum Physics, Climate Change..."
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 text-base sm:text-lg border-2 border-cyan-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-black/30 backdrop-blur-md text-white placeholder-white/50"
                    autoFocus
                  />

                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateTree}
                    disabled={loading}
                    className="mt-4 sm:mt-6 w-full px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white text-base sm:text-lg font-medium rounded-xl 
                              hover:from-cyan-600 hover:to-fuchsia-700 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                              flex items-center justify-center gap-2 border border-white/20"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full" />
                        <span className="text-sm sm:text-base">
                          Generating...
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles
                          size={16}
                          className="sm:w-5 sm:h-5 animate-pulse"
                        />
                        <span className="text-sm sm:text-base">
                          Generate Learning Tree
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 sm:mt-4 text-sm sm:text-base text-red-400 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {nodes.length > 0 && (
                  <div className="mt-3 sm:mt-4 text-center">
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-sm sm:text-base text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      Return to current tree
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Modal */}
        <AnimatePresence>
          {chatModalOpen && (
            <ChatModal
              isOpen={chatModalOpen}
              onClose={() => setChatModalOpen(false)}
              nodeTitle={currentNodeTitle}
            />
          )}
        </AnimatePresence>

        {/* Node Name Modal */}
        <AnimatePresence>
          {showNodeNameModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="bg-black/50 backdrop-blur-xl rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] p-6 max-w-md w-full relative border border-white/20"
              >
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowNodeNameModal(false);
                    setNewNodeName("");
                    setSelectedParentNode(null);
                    setSelectedPosition(null);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  <X size={20} />
                </motion.button>

                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text">
                    Name Your New Node
                  </h2>
                  <p className="text-sm text-white/80 mt-1">
                    Enter a name for your new learning node
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleNodeNameSubmit();
                      }
                    }}
                    placeholder="Enter node name..."
                    className="w-full px-4 py-3 text-base border-2 border-cyan-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-black/30 backdrop-blur-md text-white placeholder-white/50"
                    autoFocus
                  />

                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNodeNameSubmit}
                    disabled={!newNodeName.trim()}
                    className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white text-base font-medium rounded-xl 
                              hover:from-cyan-600 hover:to-fuchsia-700 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                              flex items-center justify-center gap-2 border border-white/20"
                  >
                    <Sparkles size={16} className="animate-pulse" />
                    Create Node
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
