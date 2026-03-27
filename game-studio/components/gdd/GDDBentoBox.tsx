"use client";

import { useState } from "react";
import type { GameDesignDoc, GDDSection } from "@/lib/types";

interface GDDBentoBoxProps {
  gdd: GameDesignDoc;
  visible: boolean;
}

const accentColors: Record<string, { text: string; border: string; bg: string }> = {
  rose: { text: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" },
  emerald: { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
  amber: { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
  sky: { text: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
};

function GDDCard({ section }: { section: GDDSection }) {
  const colors = accentColors[section.accent] ?? accentColors.sky;

  return (
    <div
      className={`rounded-lg p-2.5 transition-all ${
        section.status === "empty"
          ? "border border-dashed border-neutral-700 bg-neutral-800/30"
          : `border ${colors.border} ${colors.bg}`
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
          {section.status === "locked" && "✓ "}
          {section.title}
        </span>
        {section.status === "drafting" && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            drafting
          </span>
        )}
      </div>
      <div
        className={`text-[11px] leading-relaxed ${
          section.status === "empty"
            ? "text-neutral-600 italic"
            : "text-neutral-300"
        }`}
      >
        {section.status === "empty"
          ? "Waiting for input..."
          : section.content.slice(0, 60) + (section.content.length > 60 ? "..." : "")}
      </div>
    </div>
  );
}

export default function GDDBentoBox({ gdd, visible }: GDDBentoBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
    <div className="flex-shrink-0 bg-neutral-900 border-t border-neutral-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-neutral-300 text-xs font-medium">
            Game Design Doc
          </span>
          {allLocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              locked
            </span>
          )}
          {hasContent && !allLocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
              drafting
            </span>
          )}
          {!hasContent && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-600">
              empty
            </span>
          )}
        </div>
        <span className="text-neutral-600 text-[10px]">
          {isExpanded ? "▾" : "▴"}
        </span>
      </button>

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
