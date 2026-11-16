"use client"

import { useCallback, useRef } from "react"
import type { Editor } from "tldraw"

export function useCanvasAnalysis() {
  const editorRef = useRef<Editor | null>(null)

  const setEditor = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  // Capture canvas as base64 image
  const captureCanvas = useCallback(async (): Promise<string | null> => {
    const editor = editorRef.current
    if (!editor) {
      console.error("Editor not available")
      return null
    }

    try {
      const shapeIds = editor.getCurrentPageShapeIds()
      if (shapeIds.size === 0) {
        return null // Empty canvas
      }

      const result = await editor.toImage([...shapeIds], {
        format: "png",
        background: true,
        scale: 0.5, // Lower resolution for faster upload
      })

      if (!result?.blob) {
        return null
      }

      // Convert blob to base64
      const buffer = await result.blob.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      return base64
    } catch (error) {
      console.error("Error capturing canvas:", error)
      return null
    }
  }, [])

  // Analyze canvas with server vision API
  const analyzeCanvas = useCallback(async (): Promise<string | null> => {
    const base64Image = await captureCanvas()
    if (!base64Image) {
      return null
    }

    try {
      const res = await fetch("/api/analyze-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image }),
      })

      if (!res.ok) {
        throw new Error(`Analyze canvas error: ${res.statusText}`)
      }

      const data = await res.json()
      return data.description || "The student highlighted elements on the whiteboard."
    } catch (error) {
      console.error("Error analyzing canvas:", error)
      return "The student highlighted elements on the whiteboard."
    }
  }, [captureCanvas])

  // Check if canvas has content worth analyzing
  const hasContent = useCallback((): boolean => {
    const editor = editorRef.current
    if (!editor) return false
    return editor.getCurrentPageShapeIds().size > 0
  }, [])

  return {
    setEditor,
    captureCanvas,
    analyzeCanvas,
    hasContent,
  }
}
