"use client";

import { useRef } from "react";
import type { Editor } from "tldraw";
import { createShapeId, AssetRecordType } from "tldraw";

interface CanvasToolbarProps {
  editor: Editor | null;
  activeTool: string;
  onImageAdded?: (shapeId: string) => void;
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-violet-500 text-white"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function CanvasToolbar({ editor, activeTool, onImageAdded }: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setTool = (tool: string) => {
    if (!editor) return;
    editor.setCurrentTool(tool);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || !e.target.files?.length) return;

    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) return;

    const asset = await editor.getAssetForExternalContent({ type: "file", file });
    if (!asset) return;

    editor.createAssets([asset]);

    // Get actual image dimensions to preserve aspect ratio
    const assetProps = asset.props as { w?: number; h?: number };
    const naturalW = assetProps.w || 200;
    const naturalH = assetProps.h || 150;
    const maxDim = 300;
    const scale = Math.min(maxDim / naturalW, maxDim / naturalH, 1);
    const w = Math.round(naturalW * scale);
    const h = Math.round(naturalH * scale);

    const center = editor.getViewportScreenCenter();
    const pageCenter = editor.screenToPage(center);
    const shapeId = createShapeId();

    editor.createShape({
      id: shapeId,
      type: "image",
      x: pageCenter.x - w / 2,
      y: pageCenter.y - h / 2,
      props: { assetId: asset.id, w, h },
    });

    // Notify parent that an image was added (triggers AI directly)
    onImageAdded?.(shapeId);

    e.target.value = "";
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 shadow-lg">
        {/* Select */}
        <ToolButton active={activeTool === "select"} onClick={() => setTool("select")} title="Select (V)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </ToolButton>

        {/* Hand / Pan */}
        <ToolButton active={activeTool === "hand"} onClick={() => setTool("hand")} title="Hand (H)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 00-4 0v1M14 10V4a2 2 0 00-4 0v6M10 10V6a2 2 0 00-4 0v8a8 8 0 0016 0v-3a2 2 0 00-4 0" />
          </svg>
        </ToolButton>

        <div className="w-px h-5 bg-neutral-700 mx-0.5" />

        {/* Draw */}
        <ToolButton active={activeTool === "draw"} onClick={() => setTool("draw")} title="Draw (D)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
          </svg>
        </ToolButton>

        {/* Text */}
        <ToolButton active={activeTool === "text"} onClick={() => setTool("text")} title="Text (T)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </ToolButton>

        <div className="w-px h-5 bg-neutral-700 mx-0.5" />

        {/* Image upload */}
        <ToolButton active={false} onClick={() => fileInputRef.current?.click()} title="Add Image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}
