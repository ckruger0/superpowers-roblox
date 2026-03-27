"use client";

import { useState } from "react";
import type { GameDesignDoc, GDDSection } from "@/lib/types";
import { palette } from "@/lib/themes";

interface GDDFullViewProps {
  gdd: GameDesignDoc;
  onUpdate?: (section: string, content: string, status: string) => void;
  onTitleChange?: (title: string) => void;
}

const sectionMeta: Record<string, { icon: string; label: string; friendlyName: string }> = {
  rose: { icon: "🎯", label: "vision", friendlyName: "The Vibe" },
  emerald: { icon: "🎮", label: "mechanics", friendlyName: "How You Play" },
  amber: { icon: "📖", label: "narrative", friendlyName: "The Story" },
  sky: { icon: "🗺️", label: "levelPlan", friendlyName: "The Map" },
};

const sectionColors: Record<string, { bg: string; border: string; text: string }> = {
  rose: { bg: palette.rose.bg, border: palette.rose.border, text: palette.rose.text },
  emerald: { bg: palette.emerald.bg, border: palette.emerald.border, text: palette.emerald.text },
  amber: { bg: palette.amber.bg, border: palette.amber.border, text: palette.amber.text },
  sky: { bg: palette.sky.bg, border: palette.sky.border, text: palette.sky.text },
};

function BlueprintSection({ section }: { section: GDDSection }) {
  const [expanded, setExpanded] = useState(false);
  const meta = sectionMeta[section.accent] ?? sectionMeta.sky;
  const colors = sectionColors[section.accent] ?? sectionColors.sky;
  const isEmpty = section.status === "empty";

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{ border: `1px solid ${isEmpty ? palette.borderDashed : colors.border}`, borderStyle: isEmpty ? "dashed" : "solid" }}
    >
      <button
        onClick={() => !isEmpty && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ backgroundColor: expanded ? colors.bg : "transparent" }}
        disabled={isEmpty}
      >
        <span className="text-lg">{meta.icon}</span>
        <div className="flex-1">
          <span className="text-sm font-medium" style={{ color: isEmpty ? palette.textFaint : palette.textPrimary }}>
            {meta.friendlyName}
          </span>
          {!isEmpty && !expanded && (
            <p className="text-xs mt-0.5 truncate" style={{ color: palette.textMuted }}>
              {section.content.slice(0, 80)}...
            </p>
          )}
          {isEmpty && (
            <p className="text-xs mt-0.5" style={{ color: palette.textFaint }}>
              Not decided yet
            </p>
          )}
        </div>
        {section.status === "locked" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: palette.successBg, color: palette.successText }}>
            ✓
          </span>
        )}
        {section.status === "drafting" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: palette.accentBg, color: palette.accentText }}>
            Draft
          </span>
        )}
        {!isEmpty && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: palette.textFaint, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4" style={{ backgroundColor: colors.bg }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: palette.textSecondary }}>
            {section.content}
          </p>
        </div>
      )}
    </div>
  );
}

function generateTags(gdd: GameDesignDoc): string[] {
  const tags: string[] = [];
  const all = `${gdd.vision.content} ${gdd.mechanics.content} ${gdd.narrative.content}`.toLowerCase();

  // Genre
  if (all.includes("obby")) tags.push("Obby");
  else if (all.includes("racing") || all.includes("race")) tags.push("Racing");
  else if (all.includes("survival")) tags.push("Survival");
  else if (all.includes("tycoon")) tags.push("Tycoon");
  else if (all.includes("rpg") || all.includes("quest")) tags.push("RPG");
  else if (all.includes("fighting") || all.includes("combat")) tags.push("Fighting");
  else if (all.includes("simulator")) tags.push("Simulator");
  else tags.push("Adventure");

  // Vibe
  if (all.includes("scary") || all.includes("horror") || all.includes("creepy")) tags.push("Scary");
  if (all.includes("funny") || all.includes("silly") || all.includes("toilet")) tags.push("Funny");
  if (all.includes("relaxing") || all.includes("chill") || all.includes("cozy")) tags.push("Chill");
  if (all.includes("competitive") || all.includes("pvp")) tags.push("Competitive");

  // Mechanics
  if (all.includes("multiplayer") || all.includes("players")) tags.push("Multiplayer");
  if (all.includes("lava") || all.includes("rising")) tags.push("Rising Danger");
  if (all.includes("collect") || all.includes("coins") || all.includes("gems")) tags.push("Collectibles");

  return tags.length > 0 ? tags : ["Game"];
}

function generateTagline(gdd: GameDesignDoc): string {
  if (gdd.vision.content) {
    // Take first sentence of vision
    const first = gdd.vision.content.split(/[.!?]/)[0];
    if (first && first.length < 80) return first.trim();
    return first.slice(0, 77).trim() + "...";
  }
  return "A new Roblox experience";
}

export default function GDDFullView({ gdd, onTitleChange }: GDDFullViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(gdd.title);

  const hasAnyContent =
    gdd.vision.status !== "empty" ||
    gdd.mechanics.status !== "empty" ||
    gdd.narrative.status !== "empty" ||
    gdd.levelPlan.status !== "empty";

  const tags = generateTags(gdd);
  const tagline = generateTagline(gdd);

  const filledCount = [gdd.vision, gdd.mechanics, gdd.narrative, gdd.levelPlan].filter(s => s.status !== "empty").length;

  return (
    <div className="w-full h-full overflow-y-auto p-6" style={{ backgroundColor: palette.bg }}>
      <div className="max-w-2xl mx-auto">

        {/* Game Card — like a Roblox game page */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
        >
          {/* Image placeholder */}
          <div
            className="h-48 flex items-center justify-center relative"
            style={{ backgroundColor: palette.bgCardHover }}
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">🎮</span>
              <span className="text-xs" style={{ color: palette.textFaint }}>
                Game thumbnail will appear here after building
              </span>
            </div>
            {/* Progress badge */}
            <div
              className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: palette.bgCard, color: filledCount === 4 ? palette.successText : palette.textMuted }}
            >
              {filledCount}/4 designed
            </div>
          </div>

          {/* Game info */}
          <div className="p-5">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              {isEditingTitle ? (
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false);
                    if (titleDraft.trim() && titleDraft !== gdd.title) onTitleChange?.(titleDraft.trim());
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setIsEditingTitle(false); if (titleDraft.trim() && titleDraft !== gdd.title) onTitleChange?.(titleDraft.trim()); }
                    if (e.key === "Escape") { setIsEditingTitle(false); setTitleDraft(gdd.title); }
                  }}
                  className="text-xl font-bold bg-transparent outline-none border-b-2 py-0.5 w-full"
                  style={{ color: palette.textPrimary, borderColor: palette.accent }}
                  autoFocus
                />
              ) : (
                <>
                  <h1 className="text-xl font-bold" style={{ color: palette.textPrimary }}>
                    {gdd.title}
                  </h1>
                  <button
                    onClick={() => { setTitleDraft(gdd.title); setIsEditingTitle(true); }}
                    className="opacity-30 hover:opacity-60 transition-opacity flex-shrink-0"
                    style={{ color: palette.textMuted }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Tagline */}
            <p className="text-sm mb-3" style={{ color: palette.textMuted }}>
              {hasAnyContent ? tagline : "Start brainstorming on the Ideate tab to fill this in."}
            </p>

            {/* Tags */}
            {hasAnyContent && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: palette.bgCardHover, color: palette.textSecondary, border: `1px solid ${palette.border}` }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Blueprint — expandable GDD sections */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: palette.textFaint }}>
            The Blueprint
          </h2>
          <div className="space-y-2">
            <BlueprintSection section={gdd.vision} />
            <BlueprintSection section={gdd.mechanics} />
            <BlueprintSection section={gdd.narrative} />
            <BlueprintSection section={gdd.levelPlan} />
          </div>
        </div>

        {/* Dev Log */}
        {gdd.devLog.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: palette.textFaint }}>
              Dev Log
            </h2>
            <div className="space-y-2">
              {gdd.devLog.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono" style={{ color: palette.textFaint }}>{entry.timestamp}</span>
                    <span className="text-[10px] font-medium" style={{ color: palette.accentDark }}>{entry.skill}</span>
                  </div>
                  <p className="text-xs" style={{ color: palette.textSecondary }}>{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasAnyContent && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: palette.textMuted }}>
              Head to the Ideate tab to start designing your game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
