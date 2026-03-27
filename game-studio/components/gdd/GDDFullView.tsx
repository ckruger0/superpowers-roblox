"use client";

import type { GameDesignDoc, GDDSection } from "@/lib/types";

interface GDDFullViewProps {
  gdd: GameDesignDoc;
  onUpdate?: (section: string, content: string, status: string) => void;
}

const accentColors: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  rose: { text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5", glow: "hover:border-rose-500/40" },
  emerald: { text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", glow: "hover:border-emerald-500/40" },
  amber: { text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5", glow: "hover:border-amber-500/40" },
  sky: { text: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/5", glow: "hover:border-sky-500/40" },
};

function GDDCard({ section, sectionKey }: { section: GDDSection; sectionKey: string }) {
  const colors = accentColors[section.accent] ?? accentColors.sky;

  return (
    <div
      className={`rounded-2xl p-6 border transition-colors ${colors.border} ${colors.bg} ${colors.glow} ${
        section.status === "empty" ? "border-dashed" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}>
          {section.title}
        </h3>
        {section.status === "locked" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
            Locked
          </span>
        )}
        {section.status === "drafting" && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
            Drafting
          </span>
        )}
        {section.status === "empty" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-600 font-medium">
            Empty
          </span>
        )}
      </div>

      {section.status === "empty" ? (
        <p className="text-neutral-600 text-sm italic leading-relaxed">
          Not yet defined. Head to the Ideate tab and start brainstorming — this will fill in as decisions are made.
        </p>
      ) : (
        <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
          {section.content}
        </p>
      )}
    </div>
  );
}

export default function GDDFullView({ gdd }: GDDFullViewProps) {
  const hasAnyContent =
    gdd.vision.status !== "empty" ||
    gdd.mechanics.status !== "empty" ||
    gdd.narrative.status !== "empty" ||
    gdd.levelPlan.status !== "empty";

  return (
    <div className="w-full h-full overflow-y-auto bg-neutral-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">{gdd.title}</h1>
          <p className="text-neutral-500 text-sm">
            {hasAnyContent
              ? "Your game design document — updated as you brainstorm on the canvas."
              : "Start brainstorming on the Ideate tab. Your game design will appear here."}
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <GDDCard section={gdd.vision} sectionKey="vision" />
          <GDDCard section={gdd.mechanics} sectionKey="mechanics" />
          <GDDCard section={gdd.narrative} sectionKey="narrative" />
          <GDDCard section={gdd.levelPlan} sectionKey="levelPlan" />
        </div>

        {/* Dev Log */}
        {gdd.devLog.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
              Dev Log
            </h2>
            <div className="space-y-3">
              {gdd.devLog.map((entry, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-neutral-500 text-xs font-mono">
                      {entry.timestamp}
                    </span>
                    <span className="text-violet-400 text-xs font-medium">
                      {entry.skill}
                    </span>
                  </div>
                  <p className="text-neutral-300 text-sm">{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasAnyContent && (
          <div className="text-center py-16">
            <div className="text-neutral-700 text-5xl mb-4">🎮</div>
            <p className="text-neutral-500 text-sm">
              Your game design document is empty.
            </p>
            <p className="text-neutral-600 text-xs mt-1">
              Switch to the Ideate tab, drop in some ideas, and the AI will help shape them into a game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
