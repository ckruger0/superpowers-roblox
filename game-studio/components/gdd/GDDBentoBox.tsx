"use client";

import { useState } from "react";
import type { GameDesignDoc, GDDSection } from "@/lib/types";

interface GDDBentoBoxProps {
  gdd: GameDesignDoc;
  visible: boolean;
}

const accentColors: Record<string, string> = {
  red: "#e94560",
  green: "#53d769",
  yellow: "#ffd43b",
  blue: "#5ac8fa",
};

function GDDCard({ section }: { section: GDDSection }) {
  const color = accentColors[section.accent] ?? "#888";

  return (
    <div
      className="rounded-lg p-2.5 transition-all"
      style={{
        background: "#0f3460",
        border:
          section.status === "empty"
            ? "1px dashed #333"
            : `1px solid ${color}30`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {section.status === "locked" && "✓ "}
          {section.title}
        </span>
        {section.status === "drafting" && (
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            drafting...
          </span>
        )}
      </div>
      <div
        className={`text-[10px] leading-relaxed ${
          section.status === "empty"
            ? "text-gray-600 italic"
            : "text-[#c8d6e5]"
        }`}
      >
        {section.status === "empty"
          ? "Waiting for input..."
          : section.content.slice(0, 60) +
            (section.content.length > 60 ? "..." : "")}
      </div>
    </div>
  );
}

export default function GDDBentoBox({ gdd, visible }: GDDBentoBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!visible) return null;

  const allLocked =
    gdd.vision.status === "locked" &&
    gdd.mechanics.status === "locked" &&
    gdd.narrative.status === "locked" &&
    gdd.levelPlan.status === "locked";

  const hasContent =
    gdd.vision.status !== "empty" ||
    gdd.mechanics.status !== "empty" ||
    gdd.narrative.status !== "empty" ||
    gdd.levelPlan.status !== "empty";

  return (
    <div className="flex-shrink-0 bg-[#16213e] border-t border-gray-800">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-[#1a2744] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#5ac8fa] text-xs font-semibold">
            {gdd.title} — Game Design Doc
          </span>
          {allLocked && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#53d769]/20 text-[#53d769]">
              locked
            </span>
          )}
          {hasContent && !allLocked && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#5ac8fa]/20 text-[#5ac8fa]">
              drafting
            </span>
          )}
          {!hasContent && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-500">
              empty
            </span>
          )}
        </div>
        <span className="text-gray-500 text-[10px]">
          {isExpanded ? "▾" : "▴"}
        </span>
      </button>

      {/* Bento grid */}
      {isExpanded && (
        <div className="px-3 pb-2 grid grid-cols-4 gap-2">
          <GDDCard section={gdd.vision} />
          <GDDCard section={gdd.mechanics} />
          <GDDCard section={gdd.narrative} />
          <GDDCard section={gdd.levelPlan} />
        </div>
      )}
    </div>
  );
}
