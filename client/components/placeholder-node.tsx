import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { motion } from "framer-motion";

export const PlaceholderNode = memo(({ selected }: NodeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl shadow-lg backdrop-blur-md border-2 border-dashed relative min-w-48 ${
        selected
          ? "border-cyan-400 bg-cyan-500/10"
          : "border-white/30 hover:border-cyan-300/70 hover:shadow-cyan-100/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10 }}
        className="border-2 border-cyan-300 bg-white"
      />
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-2xl font-bold text-white/80">+</div>
      </div>
    </motion.div>
  );
}); 