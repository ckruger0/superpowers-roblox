"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, Fragment } from "react";
import GDDFullView from "@/components/gdd/GDDFullView";
import BuildChat from "@/components/build/BuildChat";
import type { GameDesignDoc, McpStatus } from "@/lib/types";

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

type Tab = "ideate" | "design" | "create";

export default function Home() {
  const [gdd, setGdd] = useState<GameDesignDoc>(emptyGDD());
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });
  const [activeTab, setActiveTab] = useState<Tab>("ideate");
  const [showAbout, setShowAbout] = useState(false);

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
      <div className="h-12 flex-shrink-0 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-5 z-50">
        {/* Left: project name */}
        <div className="flex items-center gap-2">
          <img src="/pepe_silvia_logo.png" alt="Pepe Silvia" className="h-6 w-auto" />
          <span className="text-neutral-200 font-semibold text-sm tracking-tight">
            Pepe Silvia
          </span>
          <button
            onClick={() => setShowAbout(true)}
            className="text-neutral-600 hover:text-neutral-400 transition-colors"
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
        <div className="flex items-center gap-0.5 bg-neutral-800/60 rounded-lg p-0.5">
          {(["ideate", "design", "create"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-neutral-700 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right: studio connection */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              mcpStatus.connected ? "bg-emerald-400" : "bg-neutral-600"
            }`}
          />
          <span className="text-neutral-500 text-xs">
            {mcpStatus.connected ? "Studio Connected" : "No Studio"}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Ideate: canvas */}
        {activeTab === "ideate" && (
          <GameCanvas onGddUpdate={handleGddUpdate} gdd={gdd} />
        )}

        {/* Design: full-screen GDD */}
        {activeTab === "design" && (
          <GDDFullView gdd={gdd} onUpdate={handleGddUpdate} />
        )}

        {/* Create: build chat with Roblox Studio */}
        {activeTab === "create" && (
          <BuildChat gdd={gdd} />
        )}
      </div>

      {/* About modal */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/pepe_silvia_gif.gif"
              alt="Pepe Silvia connecting the dots"
              className="w-full"
            />
            <div className="p-6">
              <h2 className="text-white font-bold text-lg mb-2">
                What is Pepe Silvia?
              </h2>
              <p className="text-neutral-300 text-sm leading-relaxed mb-3">
                You know that scene in It{"'"}s Always Sunny where Charlie is connecting
                all the dots on the wall with red string? That{"'"}s this tool.
              </p>
              <p className="text-neutral-400 text-sm leading-relaxed mb-3">
                Throw your ideas at the canvas — images, notes, sketches, vibes, whatever.
                The AI watches everything and connects the dots into a real game design.
                Once the design is solid, an AI agent swarm builds it in Roblox Studio.
              </p>
              <p className="text-neutral-500 text-xs">
                Ideate → Design → Create. From chaos to game.
              </p>
              <button
                onClick={() => setShowAbout(false)}
                className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg transition-colors"
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
