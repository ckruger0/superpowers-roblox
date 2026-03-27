"use client";

import { useRef, useState, useCallback } from "react";
import type { Editor } from "tldraw";
import { createShapeId } from "tldraw";
import type { Theme } from "@/lib/themes";

interface CanvasToolbarProps {
  editor: Editor | null;
  activeTool: string;
  onImageAdded?: (shapeId: string) => void;
  theme?: Theme;
}

function ToolButton({
  active,
  onClick,
  title,
  children,
  activeClass = "bg-[#c5a3d9] text-white",
  inactiveClass = "text-[#8a7d6b] hover:text-[#5c4f3d] hover:bg-black/5",
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  activeClass?: string;
  inactiveClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      {children}
    </button>
  );
}

export default function CanvasToolbar({ editor, activeTool, onImageAdded, theme }: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

    onImageAdded?.(shapeId);
    e.target.value = "";
  };

  const toggleVoice = useCallback(() => {
    if (!editor) return;

    // Stop if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript || !editor) return;

      // Place the transcribed text as a text shape on the canvas
      const center = editor.getViewportScreenCenter();
      const pageCenter = editor.screenToPage(center);
      const shapeId = createShapeId();

      // Use the text tool to place it, then set content — matches the style of manual text
      editor.setCurrentTool("text");
      editor.createShape({
        id: shapeId,
        type: "text",
        x: pageCenter.x - 50,
        y: pageCenter.y - 10,
        props: {
          richText: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: transcript }],
              },
            ],
          },
          autoSize: true,
        },
      });
      editor.setCurrentTool("select");
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [editor, isListening]);

  const activeBtn = theme?.toolbarActiveBtn ?? "bg-[#c5a3d9] text-white";
  const inactiveBtn = `${theme?.toolbarText ?? "text-[#8a7d6b]"} ${theme?.toolbarHover ?? "hover:text-[#5c4f3d] hover:bg-black/5"}`;
  const sep = theme?.toolbarBorder ?? "border-[#e8dfd6]";

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`flex items-center gap-1 ${theme?.toolbarBg ?? "bg-[#f5f0eb]"} border ${theme?.toolbarBorder ?? "border-[#e8dfd6]"} rounded-xl px-2 py-1.5 shadow-lg transition-colors duration-300`}>
        {/* Select */}
        <ToolButton active={activeTool === "select"} onClick={() => setTool("select")} title="Select (V)" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </ToolButton>

        {/* Hand / Pan */}
        <ToolButton active={activeTool === "hand"} onClick={() => setTool("hand")} title="Hand (H)" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 00-4 0v1M14 10V4a2 2 0 00-4 0v6M10 10V6a2 2 0 00-4 0v8a8 8 0 0016 0v-3a2 2 0 00-4 0" />
          </svg>
        </ToolButton>

        <div className={`w-px h-5 bg-black/10 mx-0.5`} />

        {/* Creation tools — grouped */}
        <ToolButton active={activeTool === "draw"} onClick={() => setTool("draw")} title="Draw (D)" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
          </svg>
        </ToolButton>

        <ToolButton active={activeTool === "text"} onClick={() => setTool("text")} title="Text (T)" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </ToolButton>

        <ToolButton active={false} onClick={() => fileInputRef.current?.click()} title="Add Image" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolButton>

        <ToolButton active={isListening} onClick={toggleVoice} title="Voice to Text" activeClass={activeBtn} inactiveClass={inactiveBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
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
