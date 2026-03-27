"use client";

import { useState } from "react";

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
}

export default function AIBubble({
  message,
  quickReplies = [],
  showFreeform = true,
  position,
  onReply,
  onDismiss,
}: AIBubbleProps) {
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformText, setFreeformText] = useState("");

  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%) translateY(-16px)",
        maxWidth: 320,
      }}
    >
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-neutral-400 text-[10px] font-medium">AI</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors"
          >
            ×
          </button>
        </div>

        {/* Message */}
        <div className="px-3 py-2">
          <p className="text-neutral-200 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {quickReplies.map((reply) => (
              <button
                key={reply.value}
                onClick={() => onReply(reply.value)}
                className="px-3 py-1 text-xs font-medium rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300 transition-colors"
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
              className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              + Add more detail...
            </button>
          </div>
        )}

        {showFreeform && freeformOpen && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg px-2.5 py-1.5 border border-neutral-700 focus-within:border-violet-500/40 transition-colors">
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
                className="flex-1 bg-transparent text-neutral-200 text-xs outline-none placeholder-neutral-600"
                autoFocus
              />
              <button
                onClick={() => {
                  if (freeformText.trim()) {
                    onReply(freeformText.trim());
                    setFreeformText("");
                  }
                }}
                className="text-violet-400 hover:text-violet-300 text-xs transition-colors"
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pointer triangle */}
      <div className="flex justify-center">
        <div className="w-3 h-3 bg-neutral-900 border-r border-b border-neutral-700 transform rotate-45 -mt-1.5" />
      </div>
    </div>
  );
}
