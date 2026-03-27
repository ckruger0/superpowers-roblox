"use client";

import { useState, useEffect, useCallback } from "react";
import GDDFullView from "@/components/gdd/GDDFullView";
import BuildChat from "@/components/build/BuildChat";
import GameCanvas from "@/components/canvas/GameCanvas";
import type { GameDesignDoc, McpStatus } from "@/lib/types";
import { theme, palette, type Tab } from "@/lib/themes";

function emptyGDD(): GameDesignDoc {
  const emptySection = (title: string, accent: string) => ({
    title,
    content: "",
    status: "empty" as const,
    accent,
  });
  return {
    title: "Untitled Game",
    vision: emptySection("Vision", "rose"),
    mechanics: emptySection("Mechanics", "emerald"),
    narrative: emptySection("Narrative", "amber"),
    levelPlan: emptySection("Level Plan", "sky"),
    devLog: [],
  };
}

export default function App() {
  const [gdd, setGdd] = useState<GameDesignDoc>(emptyGDD());
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });
  const [activeTab, setActiveTab] = useState<Tab>("ideate");
  const [showAbout, setShowAbout] = useState(false);
  const [studioSpaces, setStudioSpaces] = useState<Array<{ name: string; id: string }>>([]);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [showSpaces, setShowSpaces] = useState(false);

  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then((status: McpStatus) => {
        setMcpStatus(status);
        if (status.connected) {
          fetch("/api/mcp/spaces")
            .then((r) => r.json())
            .then((data: { spaces: Array<{ name: string; id: string }> }) => {
              setStudioSpaces(data.spaces || []);
            })
            .catch(() => {});
        }
      })
      .catch(() => setMcpStatus({ connected: false, error: "Backend unreachable" }));
  }, []);

  const handleGddUpdate = useCallback(
    (section: string, content: string, status: string) => {
      setGdd((prev) => {
        const key = section as keyof Pick<GameDesignDoc, "vision" | "mechanics" | "narrative" | "levelPlan">;
        if (!prev[key]) return prev;
        return {
          ...prev,
          [key]: {
            ...prev[key],
            content,
            status: status as "empty" | "drafting" | "locked",
          },
        };
      });
    },
    []
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: palette.bg }}>
      {/* Top navbar */}
      <div
        className="h-12 flex-shrink-0 flex items-center justify-between px-5 z-50"
        style={{ backgroundColor: palette.bgCard, borderBottom: `1px solid ${palette.borderLight}` }}
      >
        {/* Left: project name */}
        <div className="flex items-center gap-2">
          <img src="/pepe_silvia_logo.png" alt="Pepe Silvia" className="h-6 w-auto" />
          <span className="font-semibold text-sm tracking-tight" style={{ color: palette.textPrimary }}>
            Pepe Silvia
          </span>
          <button
            onClick={() => setShowAbout(true)}
            className="opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: palette.textMuted }}
            title="What is this?"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>

        {/* Center: tab switcher */}
        <div className="flex items-center gap-1">
          {(["ideate", "design", "create"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1 text-xs font-medium capitalize transition-all relative"
              style={{
                color: activeTab === tab ? palette.textPrimary : palette.textFaint,
              }}
            >
              {tab}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ backgroundColor: palette.accent }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Right: studio connection button */}
        <div className="relative">
          <button
            onClick={() => mcpStatus.connected && setShowSpaces(!showSpaces)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
            style={{
              color: palette.textMuted,
              backgroundColor: showSpaces ? palette.bgCardHover : "transparent",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: mcpStatus.connected ? palette.success : palette.textFaint }}
            />
            <span className="text-xs">
              {mcpStatus.connected ? "Studio Connected" : "No Studio"}
            </span>
            {mcpStatus.connected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {showSpaces && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSpaces(false)} />
              <div
                className="absolute top-full right-0 mt-1 rounded-lg shadow-lg py-2 min-w-[240px] z-50"
                style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
              >
                <div className="px-3 py-1 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: palette.textFaint }}>
                    Open Spaces
                  </span>
                </div>
                {studioSpaces.length > 0 ? (
                  studioSpaces.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => {
                        setSelectedSpace(space.id);
                        setShowSpaces(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors"
                      style={{ color: palette.textSecondary }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = palette.bgCardHover)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: (selectedSpace ?? studioSpaces[0]?.id) === space.id ? palette.accent : palette.border,
                        }}
                      >
                        {(selectedSpace ?? studioSpaces[0]?.id) === space.id && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.accent }} />
                        )}
                      </div>
                      <span>{space.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs" style={{ color: palette.textFaint }}>
                    Loading spaces...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content area — canvas stays mounted (hidden) to preserve state */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === "ideate" ? "" : "hidden"}`}>
          <GameCanvas onGddUpdate={handleGddUpdate} gdd={gdd} theme={theme} />
        </div>

        {activeTab === "design" && (
          <GDDFullView gdd={gdd} onUpdate={handleGddUpdate} />
        )}

        {activeTab === "create" && (
          <BuildChat gdd={gdd} />
        )}
      </div>

      {/* About modal */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: "rgba(60, 46, 30, 0.3)" }}
          onClick={() => setShowAbout(false)}
        >
          <div
            className="rounded-2xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/pepe_silvia_gif.gif"
              alt="Pepe Silvia connecting the dots"
              className="w-full"
            />
            <div className="p-6">
              <h2 className="font-bold text-lg mb-2" style={{ color: palette.textPrimary }}>
                What is Pepe Silvia?
              </h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: palette.textSecondary }}>
                You know that scene in It{"'"}s Always Sunny where Charlie is connecting
                all the dots on the wall with red string? That{"'"}s this tool.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: palette.textMuted }}>
                Throw your ideas at the canvas — images, notes, sketches, vibes, whatever.
                The AI watches everything and connects the dots into a real game design.
                Once the design is solid, an AI agent swarm builds it in Roblox Studio.
              </p>
              <p className="text-xs" style={{ color: palette.textFaint }}>
                Ideate → Design → Create. From chaos to game.
              </p>
              <button
                onClick={() => setShowAbout(false)}
                className="mt-4 w-full py-2 text-sm rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: palette.bgCardHover,
                  color: palette.textSecondary,
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
