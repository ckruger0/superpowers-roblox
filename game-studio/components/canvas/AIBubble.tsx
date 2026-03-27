"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Theme } from "@/lib/themes";
import { palette } from "@/lib/themes";

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
  const [replyOpen, setReplyOpen] = useState(false);
  const [freeformText, setFreeformText] = useState("");
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPos = dragPos ?? position;

  // Determine whether to show above or below the anchor based on available space
  useEffect(() => {
    if (dragPos) return; // Don't adjust when dragged
    const navbarHeight = 48;
    const bubbleHeight = 120; // rough estimate
    if (currentPos.y - bubbleHeight < navbarHeight) {
      setPlacement("below");
    } else {
      setPlacement("above");
    }
  }, [currentPos.y, dragPos]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return;
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
        setDragPos({
          x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
          y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
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

  // Clamp position to viewport
  const clampedX = Math.max(120, Math.min(currentPos.x, window.innerWidth - 120));
  const clampedY = Math.max(60, Math.min(currentPos.y, window.innerHeight - 60));

  const isAbove = placement === "above" && !dragPos;

  return (
    <div
      ref={containerRef}
      className="absolute z-40 pointer-events-auto"
      style={{
        left: clampedX,
        top: clampedY,
        transform: isAbove
          ? "translate(-50%, -100%) translateY(-12px)"
          : "translate(-50%, 12px)",
        maxWidth: 280,
        minWidth: 180,
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Pointer triangle — above */}
      {!dragPos && placement === "below" && (
        <div className="flex justify-center mb-[-6px] relative z-10">
          <div
            className="w-2.5 h-2.5 transform rotate-45"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}`, borderBottom: "none", borderRight: "none" }}
          />
        </div>
      )}

      <div
        className="rounded-xl shadow-lg overflow-hidden"
        style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
      >
        {/* Header — drag handle */}
        <div
          data-drag-handle
          className="flex items-center justify-between px-2.5 py-1 cursor-grab active:cursor-grabbing select-none"
          style={{ borderBottom: `1px solid ${palette.borderLight}` }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.accent }} />
            <span className="text-[10px] font-medium" style={{ color: palette.accentDark }}>AI</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="text-black/20 hover:text-black/50 text-xs transition-colors leading-none"
          >
            ×
          </button>
        </div>

        {/* Message — compact */}
        <div className="px-2.5 py-2">
          <p className="text-[13px] leading-snug" style={{ color: palette.textPrimary }}>
            {message}
          </p>
        </div>

        {/* Reply button — collapsed state */}
        {!replyOpen && (
          <div className="px-2.5 pb-2">
            <button
              onClick={() => setReplyOpen(true)}
              className="w-full py-1.5 text-[11px] font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: palette.accentBg,
                color: palette.accentText,
              }}
            >
              Reply
            </button>
          </div>
        )}

        {/* Reply panel — expanded */}
        {replyOpen && (
          <div className="px-2.5 pb-2 space-y-1.5">
            {/* Quick replies */}
            {quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.value}
                    onClick={() => { onReply(reply.value); setReplyOpen(false); }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors"
                    style={{
                      backgroundColor: palette.bgCardHover,
                      color: palette.textSecondary,
                      border: `1px solid ${palette.border}`,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = palette.accentBg;
                      e.currentTarget.style.borderColor = palette.accent;
                      e.currentTarget.style.color = palette.accentText;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = palette.bgCardHover;
                      e.currentTarget.style.borderColor = palette.border;
                      e.currentTarget.style.color = palette.textSecondary;
                    }}
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}

            {/* Freeform input */}
            {showFreeform && (
              <div
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                style={{ backgroundColor: palette.bgCardHover, border: `1px solid ${palette.border}` }}
              >
                <input
                  value={freeformText}
                  onChange={(e) => setFreeformText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && freeformText.trim()) {
                      onReply(freeformText.trim());
                      setFreeformText("");
                      setReplyOpen(false);
                    }
                  }}
                  placeholder="Or type something..."
                  className="flex-1 bg-transparent text-[11px] outline-none"
                  style={{ color: palette.textPrimary }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (freeformText.trim()) {
                      onReply(freeformText.trim());
                      setFreeformText("");
                      setReplyOpen(false);
                    }
                  }}
                  className="text-xs transition-colors"
                  style={{ color: freeformText.trim() ? palette.accentDark : palette.textFaint }}
                >
                  ➤
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pointer triangle — below */}
      {!dragPos && placement === "above" && (
        <div className="flex justify-center mt-[-6px] relative z-10">
          <div
            className="w-2.5 h-2.5 transform rotate-45"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}`, borderTop: "none", borderLeft: "none" }}
          />
        </div>
      )}
    </div>
  );
}
