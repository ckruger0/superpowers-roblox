"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import GDDFullView from "@/components/gdd/GDDFullView";
import BuildChat from "@/components/build/BuildChat";
import type { GameDesignDoc, McpStatus } from "@/lib/types";
import { themes, type Tab } from "@/lib/themes";

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

const GameCanvas = dynamic(() => import("@/components/canvas/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-neutral-950 flex items-center justify-center">
      <span className="text-neutral-600 text-sm">Loading canvas...</span>
    </div>
  ),
});

export default function Home() {
  const [gdd, setGdd] = useState<GameDesignDoc>(emptyGDD());
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });
  const [activeTab, setActiveTab] = useState<Tab>("ideate");
  const [showAbout, setShowAbout] = useState(false);

  const theme = themes[activeTab];

  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then(setMcpStatus)
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
    <div className="h-screen w-screen bg-neutral-950 overflow-hidden flex flex-col">
      {/* Top navbar */}
      <div className={`h-12 flex-shrink-0 ${theme.navBg} border-b ${theme.navBorder} flex items-center justify-between px-5 z-50 transition-colors duration-300`}>
        {/* Left: project name */}
        <div className="flex items-center gap-2">
          <img src="/pepe_silvia_logo.png" alt="Pepe Silvia" className="h-6 w-auto" />
          <span className={`${theme.navText} font-semibold text-sm tracking-tight`}>
            Pepe Silvia
          </span>
          <button
            onClick={() => setShowAbout(true)}
            className={`${theme.tabInactiveText} hover:${theme.navText} transition-colors opacity-60 hover:opacity-100`}
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
        <div className="flex items-center gap-0.5 bg-black/5 rounded-lg p-0.5">
          {(["ideate", "design", "create"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const t = themes[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1 rounded-md text-xs font-medium capitalize transition-all duration-200 ${
                  isActive
                    ? `${t.tabActiveBg} ${t.tabActiveText} shadow-sm`
                    : `${theme.tabInactiveText} hover:bg-black/5`
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Right: studio connection */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              mcpStatus.connected ? "bg-emerald-400" : "bg-neutral-400"
            }`}
          />
          <span className={`${theme.tabInactiveText} text-xs`}>
            {mcpStatus.connected ? "Studio Connected" : "No Studio"}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "ideate" && (
          <GameCanvas onGddUpdate={handleGddUpdate} gdd={gdd} theme={themes[activeTab]} />
        )}

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-[#faf7f4] border border-[#e8dfd6] rounded-2xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/pepe_silvia_gif.gif"
              alt="Pepe Silvia connecting the dots"
              className="w-full"
            />
            <div className="p-6">
              <h2 className="text-[#3d2e1e] font-bold text-lg mb-2">
                What is Pepe Silvia?
              </h2>
              <p className="text-[#5c4f3d] text-sm leading-relaxed mb-3">
                You know that scene in It{"'"}s Always Sunny where Charlie is connecting
                all the dots on the wall with red string? That{"'"}s this tool.
              </p>
              <p className="text-[#8a7d6b] text-sm leading-relaxed mb-3">
                Throw your ideas at the canvas — images, notes, sketches, vibes, whatever.
                The AI watches everything and connects the dots into a real game design.
                Once the design is solid, an AI agent swarm builds it in Roblox Studio.
              </p>
              <p className="text-[#a89880] text-xs">
                Ideate → Design → Create. From chaos to game.
              </p>
              <button
                onClick={() => setShowAbout(false)}
                className="mt-4 w-full py-2 bg-[#e8dfd6] hover:bg-[#ddd2c5] text-[#5c4f3d] text-sm rounded-lg transition-colors font-medium"
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
