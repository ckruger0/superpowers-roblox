"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import GDDFullView from "@/components/gdd/GDDFullView";
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
        <span className="text-neutral-200 font-semibold text-sm tracking-tight">
          Pepe Silvia
        </span>

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

        {/* Create: canvas in build mode (for now, same as ideate) */}
        {activeTab === "create" && (
          <GameCanvas onGddUpdate={handleGddUpdate} gdd={gdd} />
        )}
      </div>
    </div>
  );
}
