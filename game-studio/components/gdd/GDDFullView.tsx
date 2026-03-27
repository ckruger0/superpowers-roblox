"use client";

import type { GameDesignDoc, GDDSection } from "@/lib/types";
import { palette } from "@/lib/themes";

interface GDDFullViewProps {
  gdd: GameDesignDoc;
  onUpdate?: (section: string, content: string, status: string) => void;
}

const sectionColors = {
  rose: palette.rose,
  emerald: palette.emerald,
  amber: palette.amber,
  sky: palette.sky,
};

function GDDCard({ section }: { section: GDDSection; sectionKey: string }) {
  const colors = sectionColors[section.accent as keyof typeof sectionColors] ?? sectionColors.sky;

  const isEmpty = section.status === "empty";

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: isEmpty ? "transparent" : colors.bg,
        border: isEmpty
          ? `1.5px dashed ${palette.borderDashed}`
          : `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text }}>
          {section.title}
        </h3>
        {section.status === "locked" && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: palette.successBg, color: palette.successText }}
          >
            Locked
          </span>
        )}
        {section.status === "drafting" && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: palette.accentBg, color: palette.accentText }}
          >
            Drafting
          </span>
        )}
        {section.status === "empty" && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: palette.bgCardHover, color: palette.textFaint }}
          >
            Empty
          </span>
        )}
      </div>

      <p
        className="text-sm leading-relaxed"
        style={{
          color: isEmpty ? palette.textFaint : palette.textSecondary,
          fontStyle: isEmpty ? "italic" : "normal",
        }}
      >
        {isEmpty
          ? "Not yet defined. Head to the Ideate tab and start brainstorming — this will fill in as decisions are made."
          : section.content}
      </p>
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
    <div className="w-full h-full overflow-y-auto p-8" style={{ backgroundColor: palette.bg }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: palette.textPrimary }}>
            {gdd.title}
          </h1>
          <p className="text-sm" style={{ color: palette.textMuted }}>
            {hasAnyContent
              ? "Your game design document — updated as you brainstorm on the canvas."
              : "Start brainstorming on the Ideate tab. Your game design will appear here."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <GDDCard section={gdd.vision} sectionKey="vision" />
          <GDDCard section={gdd.mechanics} sectionKey="mechanics" />
          <GDDCard section={gdd.narrative} sectionKey="narrative" />
          <GDDCard section={gdd.levelPlan} sectionKey="levelPlan" />
        </div>

        {gdd.devLog.length > 0 && (
          <div className="mt-8">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: palette.textMuted }}
            >
              Dev Log
            </h2>
            <div className="space-y-3">
              {gdd.devLog.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono" style={{ color: palette.textFaint }}>
                      {entry.timestamp}
                    </span>
                    <span className="text-xs font-medium" style={{ color: palette.accentDark }}>
                      {entry.skill}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: palette.textSecondary }}>{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAnyContent && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🎮</div>
            <p className="text-sm" style={{ color: palette.textMuted }}>
              Your game design document is empty.
            </p>
            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Switch to the Ideate tab, drop in some ideas, and the AI will help shape them into a game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
