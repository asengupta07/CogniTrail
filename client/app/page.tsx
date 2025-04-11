"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
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
} from "reactflow"
import "reactflow/dist/style.css"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Clock, Search, Zap, MessageSquare } from "lucide-react"
import { ZoomSlider } from "@/components/zoom-slider"
import { formatDate } from "@/lib/utils"
import { ChatModal } from "@/components/chat-modal"

interface TreeData {
  title: string
  summary: string
  keywords: string[]
}

interface CustomNodeData {
  label: string
  summary?: string
  isRoot?: boolean
  onGenerate?: () => void
  isLoading?: boolean
  onLearnMore?: () => void
}

interface ChatHistory {
  _id: string
  topic: string
  date: string
  nodes: Node[]
  edges: Edge[]
}

const CustomNode = ({ data }: { data: CustomNodeData }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-xl shadow-lg ${
        data.isRoot
          ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white w-[800px]"
          : "bg-white border border-gray-200 hover:border-purple-300 hover:shadow-purple-100"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10 }}
        className="border-2 border-purple-300 bg-white"
      />
      <div className={`font-bold text-lg mb-3 ${data.isRoot ? "text-white" : "text-gray-800"}`}>{data.label}</div>
      {data.summary && (
        <div className={`text-sm mb-3 ${data.isRoot ? "text-white/90" : "text-gray-600"}`}>{data.summary}</div>
      )}
      <div className="flex gap-2">
        {!data.isRoot && data.onGenerate && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm rounded-lg 
                      hover:from-purple-600 hover:to-violet-700 shadow-md flex items-center gap-2
                      disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={data.onGenerate}
            disabled={data.isLoading}
          >
            {data.isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Exploring...
              </>
            ) : (
              <>
                <Zap size={16} />
                Explore
              </>
            )}
          </motion.button>
        )}
        {data.summary && data.onLearnMore && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm rounded-lg 
                      hover:from-teal-600 hover:to-emerald-700 shadow-md flex items-center gap-2"
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
        className="border-2 border-purple-300 bg-white"
      />
    </motion.div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

const edgeTypes: EdgeTypes = {
  bezier: BezierEdge,
}

export default function LearningTree() {
  const [showModal, setShowModal] = useState(true)
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes, onNodesState] = useNodesState([])
  const [edges, setEdges, onEdgesState] = useEdgesState([])
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [currentNodeTitle, setCurrentNodeTitle] = useState("")
  const nodeId = useRef(0)
  const nodesRef = useRef<Node[]>([])
  const historyUpdateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update the ref whenever nodes change
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // Fetch chat history (dummy implementation)
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch("/api/history")
        if (!response.ok) {
          throw new Error("Failed to fetch chat history")
        }
        const data = await response.json()
        if (data.length === 0) setChatHistory([])
        else {
          setChatHistory(data)
        }
      } catch (error) {
        console.error("Error fetching chat history:", error)
      }
    }

    fetchChatHistory()
  }, [])

  const getNextId = (parentId?: string) => {
    nodeId.current += 1
    return parentId ? `${parentId}-${nodeId.current}` : `node-${nodeId.current}`
  }

  const resetNodeIds = () => {
    nodeId.current = 0
  }

  const nodeHeight = 40
  const MIN_HORIZONTAL_SPACING = 2000 // Minimum spacing between nodes
  const verticalSpacing = 200
  const NODE_WIDTH = 200 // Base width for non-root nodes
  const ROOT_NODE_WIDTH = 500 // Width for root nodes
  const COLLISION_THRESHOLD = 300 // Minimum distance between nodes
  const COLLISION_RESOLUTION = 1000 // How far to move a node when collision is detected

  const calculateNodeWidth = (node: Node) => {
    return node.data.isRoot ? ROOT_NODE_WIDTH : NODE_WIDTH
  }

  const calculateSubtreeHeight = (data: TreeData): number => {
    // Base height for the current node
    let height = nodeHeight

    // If this node has children, add their heights plus spacing
    if (data.keywords && data.keywords.length > 0) {
      height += data.keywords.length * (nodeHeight + verticalSpacing)
    }

    return height
  }

  const checkNodeCollision = (position: XYPosition, existingNodes: Node[]): boolean => {
    return existingNodes.some((node) => {
      const dx = Math.abs(position.x - node.position.x)
      const dy = Math.abs(position.y - node.position.y)
      return dx < COLLISION_THRESHOLD && dy < COLLISION_THRESHOLD
    })
  }

  const resolveCollision = (position: XYPosition, existingNodes: Node[]): XYPosition => {
    let newX = position.x
    while (checkNodeCollision({ x: newX, y: position.y }, existingNodes)) {
      newX += COLLISION_RESOLUTION
    }
    return { x: newX, y: position.y }
  }

  const handleLearnMore = (nodeTitle: string) => {
    setCurrentNodeTitle(nodeTitle)
    setChatModalOpen(true)
  }

  const convertToReactFlowElements = (
    data: TreeData,
    position: XYPosition = { x: 0, y: 0 },
    depth = 0,
    parentId?: string,
  ): { nodes: Node[]; edges: Edge[] } => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Create root node
    const rootNode: Node = {
      id: parentId || "root",
      type: "custom",
      position,
      data: {
        label: data.title,
        summary: data.summary,
        isRoot: !parentId,
        onLearnMore: data.summary ? () => handleLearnMore(data.title) : undefined,
      },
    }
    nodes.push(rootNode)

    // Calculate parent node width
    const parentWidth = calculateNodeWidth(rootNode)

    // Create child nodes and edges
    const childrenCount = data.keywords.length
    if (childrenCount > 0) {
      // Calculate total height needed for all children
      const totalChildHeight = childrenCount * (nodeHeight + verticalSpacing) - verticalSpacing
      const startY = position.y - totalChildHeight / 2

      data.keywords.forEach((keyword, index) => {
        let childPosition: XYPosition = {
          x: position.x + parentWidth + MIN_HORIZONTAL_SPACING,
          y: startY + index * (nodeHeight + verticalSpacing),
        }

        // Check for collisions with existing nodes and resolve if needed
        if (nodesRef.current.length > 0) {
          childPosition = resolveCollision(childPosition, nodesRef.current)
        }

        const childNodeId = getNextId(rootNode.id)
        const childNode: Node = {
          id: childNodeId,
          type: "custom",
          position: childPosition,
          data: {
            label: keyword,
            onGenerate: () => generateTreeForNode(childNodeId, keyword),
          },
        }

        nodes.push(childNode)

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
            color: "#9333ea",
          },
          style: {
            stroke: "#9333ea",
            strokeWidth: 2,
          },
        }

        edges.push(edge)
      })
    }

    return { nodes, edges }
  }

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
              color: "#9333ea",
            },
            style: {
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          },
          eds,
        ),
      ),
    [setEdges],
  )

  // Function to update history (now uses useCallback and takes arguments)
  const updateHistory = useCallback(
    async (historyId: string, nodesToSave: Node[], edgesToSave: Edge[]) => {
      if (!historyId) return // Safety check

      try {
        console.log(`Attempting to update history ${historyId}`)
        const response = await fetch("/api/history/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyId, nodes: nodesToSave, edges: edgesToSave }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`Failed to update chat history: ${response.status} ${errorBody}`)
        }

        // Update local chat history state optimistically
        setChatHistory((prev) =>
          prev.map((item) => (item._id === historyId ? { ...item, nodes: nodesToSave, edges: edgesToSave } : item)),
        )
        console.log(`History ${historyId} updated successfully locally.`)
      } catch (err) {
        // Make sure 'err' is typed correctly if needed, e.g., catch (err: any)
        console.error("Error updating history:", err)
        setError(`Failed to save changes: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    [setChatHistory, setError],
  ) // Added setError dependency

  const generateTreeForNode = async (parentNodeId: string, topic: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log("Generating for node:", parentNodeId)

      // Update the parent node to show loading state
      setNodes((nds) =>
        nds.map((node) => (node.id === parentNodeId ? { ...node, data: { ...node.data, isLoading: true } } : node)),
      )

      const response = await fetch("/api/initTree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data: TreeData = await response.json()

      // Get the parent node's position from the ref
      const parentNode = nodesRef.current.find((n) => n.id === parentNodeId)

      if (!parentNode) {
        throw new Error("Parent node not found")
      }

      // Convert the data to ReactFlow elements starting from parent position
      const { nodes: newNodes, edges: newEdges } = convertToReactFlowElements(
        data,
        parentNode.position,
        1,
        parentNodeId,
      )

      // Update the parent node with summary and remove loading state
      const updatedParentNode = {
        ...parentNode,
        data: {
          ...parentNode.data,
          summary: data.summary,
          onGenerate: undefined,
          isLoading: false,
          onLearnMore: () => handleLearnMore(data.title),
        },
      }

      // Set the nodes and edges with animation delay
      setTimeout(() => {
        let finalNodes: Node[] = []
        setNodes((nds) => {
          const filteredNodes = nds.filter((n) => n.id !== parentNodeId)
          finalNodes = [...filteredNodes, updatedParentNode, ...newNodes.filter((n) => n.id !== parentNodeId)]
          return finalNodes
        })

        let finalEdges: Edge[] = []
        setEdges((eds) => {
          finalEdges = [...eds, ...newEdges]
          return finalEdges
        })

        // Update history after state updates are likely processed
        setTimeout(() => {
          if (currentHistoryId) {
            updateHistory(currentHistoryId, finalNodes, finalEdges)
          }
        }, 0)
      }, 300)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to generate the learning tree. Please try again.")
      // Reset loading state on error
      setNodes((nds) =>
        nds.map((node) => (node.id === parentNodeId ? { ...node, data: { ...node.data, isLoading: false } } : node)),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTree = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic to learn about")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Reset node IDs when generating a new tree
      resetNodeIds()

      const response = await fetch("/api/initTree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data: TreeData = await response.json()

      // Convert the data to ReactFlow elements
      const { nodes, edges } = convertToReactFlowElements(data)

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
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save chat history")
      }

      // Update local chat history
      const newHistoryItem = await saveResponse.json()
      setChatHistory((prev) => [newHistoryItem, ...prev])
      setCurrentHistoryId(newHistoryItem._id) // Set the current history ID

      // Close modal and set the nodes and edges
      setShowModal(false)
      setNodes(nodes)
      setEdges(edges)
    } catch (err) {
      console.error("Error:", err)
      setError("Failed to generate the learning tree. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGenerateTree()
    }
  }

  const loadHistoryItem = async (historyId: string) => {
    try {
      const historyItem = chatHistory.find((item) => item._id === historyId)
      if (!historyItem) return

      setTopic(historyItem.topic)

      // Add onGenerate function to unexplored nodes
      const nodesWithGenerate = historyItem.nodes.map((node) => {
        // A node is unexplored if it has no summary and is not the root node
        const isUnexplored = !node.data.summary && !node.data.isRoot
        return {
          ...node,
          data: {
            ...node.data,
            onGenerate: isUnexplored ? () => generateTreeForNode(node.id, node.data.label) : undefined,
            onLearnMore: node.data.summary ? () => handleLearnMore(node.data.label) : undefined,
          },
        }
      })

      setNodes(nodesWithGenerate)
      setEdges(historyItem.edges)
      setShowModal(false)
      setCurrentHistoryId(historyItem._id) // Set the current history ID when loading
    } catch (error) {
      console.error("Error loading history item:", error)
      setError("Failed to load history item")
    }
  }

  // useEffect to automatically update history on node/edge changes with debounce
  useEffect(() => {
    if (currentHistoryId) {
      // Nodes or edges changed while viewing a specific history item
      if (historyUpdateDebounceTimerRef.current) {
        clearTimeout(historyUpdateDebounceTimerRef.current)
      }
      console.log("Change detected, scheduling history update for:", currentHistoryId) // Add log
      historyUpdateDebounceTimerRef.current = setTimeout(() => {
        console.log("Debounced timer fired. Updating history for:", currentHistoryId) // Add log
        // Pass the current state values and the ID
        // 'nodes' and 'edges' here will be the latest state values when the timeout executes
        updateHistory(currentHistoryId, nodes, edges)
      }, 1500) // Use 1.5 seconds debounce
    }

    return () => {
      // Cleanup timer on unmount or before next run
      if (historyUpdateDebounceTimerRef.current) {
        // console.log("Cleaning up debounce timer"); // Optional log
        clearTimeout(historyUpdateDebounceTimerRef.current)
      }
    }
  }, [nodes, edges, currentHistoryId, updateHistory]) // Dependencies

  // Add this function to filter chat history based on search term
  const filteredChatHistory = chatHistory.filter((item) => item.topic.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Chat History Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-80 h-full bg-white border-r border-gray-200 shadow-sm z-10"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">History</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <ChevronLeft size={20} />
                </button>
              </div>
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100%-80px)]">
              {filteredChatHistory.map((item) => (
                <motion.div
                  key={item._id}
                  whileHover={{ backgroundColor: "rgba(147, 51, 234, 0.05)" }}
                  className="p-4 border-b border-gray-100 cursor-pointer"
                  onClick={() => loadHistoryItem(item._id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Clock size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{item.topic}</h3>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white shadow-md hover:bg-gray-50"
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
                color: "#9333ea",
              },
              style: {
                stroke: "#9333ea",
                strokeWidth: 2,
              },
            }}
            style={{ background: "#f8fafc" }}
            minZoom={0.1}
            maxZoom={3}
            defaultViewport={{ x: 0, y: 0, zoom: 2 }}
            attributionPosition="bottom-right"
          >
            <Controls className="bg-white shadow-md rounded-lg border border-gray-200" />
            <Background color="#9333ea" gap={24} size={1} />
            <ZoomSlider position="bottom-right" />
            <Panel
              position="top-center"
              className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-200"
            >
              <h1 className="text-xl font-bold text-gray-800">CogniTrail Explorer</h1>
            </Panel>
            <Panel
              position="bottom-center"
              className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200"
            >
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg 
                          hover:from-purple-600 hover:to-violet-700 shadow-md flex items-center gap-2"
              >
                <Search size={16} />
                Explore New Topic
              </button>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 relative"
              >
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Generate a CogniTrail Map</h2>
                  <p className="text-gray-600">
                    Enter a topic you want to explore, and have fun going down the rabbit hole!
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Machine Learning, Quantum Physics, Climate Change..."
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateTree}
                    disabled={loading}
                    className="mt-6 w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-lg font-medium rounded-xl 
                              hover:from-purple-600 hover:to-violet-700 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                              flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        Generate Learning Tree
                      </>
                    )}
                  </motion.button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-red-500 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {nodes.length > 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-purple-600 hover:text-purple-800 font-medium"
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
            <ChatModal isOpen={chatModalOpen} onClose={() => setChatModalOpen(false)} nodeTitle={currentNodeTitle} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
