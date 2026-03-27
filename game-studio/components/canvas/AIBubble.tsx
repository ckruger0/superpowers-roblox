"use client";

import { useState, useRef, useCallback } from "react";
import type { Theme } from "@/lib/themes";

export interface QuickReply {
  label: string;
  value: string;
}

interface AIBubbleProps {
  message: string;
  quickReplies?: QuickReply[];
  showFreeform?: boolean;
  position: { x: number; y: number };
  onReply: (text: string) => void;
  onDismiss: () => void;
  draggable?: boolean;
  theme?: Theme;
}

export default function AIBubble({
  message,
  quickReplies = [],
  showFreeform = true,
  position,
  onReply,
  onDismiss,
  draggable = false,
  theme,
}: AIBubbleProps) {
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformText, setFreeformText] = useState("");
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPos = dragPos ?? position;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return;
      // Only drag from the header area
      const target = e.target as HTMLElement;
      if (!target.closest("[data-drag-handle]")) return;

      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: currentPos.x,
        origY: currentPos.y,
      };

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setDragPos({
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
      };

      const handleUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [draggable, currentPos]
  );

  return (
    <div
      ref={containerRef}
      className="absolute z-40 pointer-events-auto"
      style={{
        left: currentPos.x,
        top: currentPos.y,
        transform: "translate(-50%, -100%) translateY(-16px)",
        maxWidth: 320,
        minWidth: 220,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className={`${theme?.bubbleBg ?? "bg-[#faf7f4]"} border ${theme?.bubbleBorder ?? "border-[#e8dfd6]"} rounded-xl shadow-2xl overflow-hidden transition-colors duration-300`}>
        {/* Header — drag handle */}
        <div
          data-drag-handle
          className={`flex items-center justify-between px-3 py-1.5 border-b ${theme?.bubbleBorder ?? "border-[#e8dfd6]"} cursor-grab active:cursor-grabbing select-none`}
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${theme?.thinkingColor ?? "bg-[#c5a3d9]"}`} />
            <span className={`${theme?.bubbleAccent ?? "text-[#8b6baa]"} text-[10px] font-medium`}>AI</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-black/30 hover:text-black/60 text-xs transition-colors"
          >
            ×
          </button>
        </div>

        {/* Message */}
        <div className="px-3 py-2">
          <p className="text-[#3d2e1e] text-sm leading-relaxed">{message}</p>
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {quickReplies.map((reply) => (
              <button
                key={reply.value}
                onClick={() => onReply(reply.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${theme?.bubbleBtnBg ?? "bg-[#f0eae4]"} text-[#5c4f3d] border ${theme?.bubbleBtnBorder ?? "border-[#e0d5c9]"} ${theme?.bubbleBtnHover ?? "hover:bg-[#e8daf0] hover:border-[#c5a3d9] hover:text-[#6b4d8a]"} transition-colors`}
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {/* Freeform input */}
        {showFreeform && !freeformOpen && (
          <div className="px-3 pb-2">
            <button
              onClick={() => setFreeformOpen(true)}
              className="text-[11px] text-black/40 hover:text-black/70 transition-colors"
            >
              + Add more detail...
            </button>
          </div>
        )}

        {showFreeform && freeformOpen && (
          <div className="px-3 pb-2">
            <div className={`flex items-center gap-1.5 ${theme?.bubbleBtnBg ?? "bg-[#f0eae4]"} rounded-lg px-2.5 py-1.5 border ${theme?.bubbleBtnBorder ?? "border-[#e0d5c9]"} transition-colors`}>
              <input
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && freeformText.trim()) {
                    onReply(freeformText.trim());
                    setFreeformText("");
                  }
                }}
                placeholder="Type here..."
                className="flex-1 bg-transparent text-[#3d2e1e] text-xs outline-none placeholder-black/30"
                autoFocus
              />
              <button
                onClick={() => {
                  if (freeformText.trim()) {
                    onReply(freeformText.trim());
                    setFreeformText("");
                  }
                }}
                className={`${theme?.bubbleAccent ?? "text-[#8b6baa]"} text-xs transition-colors`}
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pointer triangle */}
      {!dragPos && (
        <div className="flex justify-center">
          <div className={`w-3 h-3 ${theme?.bubbleBg ?? "bg-[#faf7f4]"} border-r border-b ${theme?.bubbleBorder ?? "border-[#e8dfd6]"} transform rotate-45 -mt-1.5`} />
        </div>
      )}
    </div>
  );
}
