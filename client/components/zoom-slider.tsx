"use client"

import { useCallback } from "react"
import { useReactFlow, useStore, type ReactFlowState } from "reactflow"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ZoomIn, ZoomOut } from "lucide-react"

export function ZoomSlider({ position = "top-left" }: { position?: string }) {
  const { zoomIn, zoomOut, setCenter } = useReactFlow()
  const zoom = useStore((state: ReactFlowState) => state.transform[2])

  const handleZoomChange = useCallback(
    (value: number[]) => {
      setCenter(0, 0, { zoom: value[0] })
    },
    [setCenter]
  )

  return (
    <div
      className={`absolute ${position} flex items-center gap-2 bg-white p-2 m-4 ms-16 rounded-lg shadow-md border border-gray-200`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut()}
        className="h-8 w-8"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Slider
        value={[zoom]}
        min={0.1}
        max={2}
        step={0.1}
        onValueChange={handleZoomChange}
        className="w-24 z-50 bg-black rounded-full"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn()}
        className="h-8 w-8"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  )
} 