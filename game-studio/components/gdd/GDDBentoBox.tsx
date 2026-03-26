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
  const [expanded, setExpanded] = useState(false);
  const color = accentColors[section.accent] ?? "#888";

  return (
    <div
      className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        background: "#0f3460",
        border:
          section.status === "empty"
            ? "1px dashed #333"
            : `1px solid ${color}30`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {section.status === "locked" && "✓ "}
          {section.title}
        </span>
        {section.status === "drafting" && (
          <span
            className="text-[8px] px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            drafting...
          </span>
        )}
      </div>
      <div
        className={`text-[11px] leading-relaxed ${
          section.status === "empty"
            ? "text-gray-600 italic"
            : "text-[#c8d6e5]"
        }`}
      >
        {section.status === "empty"
          ? "Waiting for input..."
          : expanded
            ? section.content
            : section.content.slice(0, 80) +
              (section.content.length > 80 ? "..." : "")}
      </div>
    </div>
  );
}

export default function GDDBentoBox({ gdd, visible }: GDDBentoBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!visible) return null;

  const hasContent =
    gdd.vision.status !== "empty" ||
    gdd.mechanics.status !== "empty" ||
    gdd.narrative.status !== "empty" ||
    gdd.levelPlan.status !== "empty";

  const allLocked =
    gdd.vision.status === "locked" &&
    gdd.mechanics.status === "locked" &&
    gdd.narrative.status === "locked" &&
    gdd.levelPlan.status === "locked";

  return (
    <div
      className="fixed bottom-0 left-4 right-[340px] z-40 bg-[#16213e] rounded-t-xl border border-b-0 transition-all"
      style={{
        borderColor: "#5ac8fa30",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2"
        style={{ background: "#5ac8fa10" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#5ac8fa] text-sm font-semibold">
            {gdd.title} — Game Design Doc
          </span>
          {allLocked && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#53d769]/20 text-[#53d769]">
              locked
            </span>
          )}
          {hasContent && !allLocked && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#5ac8fa]/20 text-[#5ac8fa]">
              drafting...
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">
          {isExpanded ? "▾ collapse" : "▴ expand"}
        </span>
      </button>

      {/* Bento grid */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-4 gap-2">
          <GDDCard section={gdd.vision} />
          <GDDCard section={gdd.mechanics} />
          <GDDCard section={gdd.narrative} />
          <GDDCard section={gdd.levelPlan} />
        </div>
      )}
    </div>
  );
}
