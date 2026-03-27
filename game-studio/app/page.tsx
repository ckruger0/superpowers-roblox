"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import GDDBentoBox from "@/components/gdd/GDDBentoBox";
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
    vision: emptySection("Vision", "red"),
    mechanics: emptySection("Mechanics", "green"),
    narrative: emptySection("Narrative", "yellow"),
    levelPlan: emptySection("Level Plan", "blue"),
    devLog: [],
  };
}

// tldraw must be loaded client-side only (no SSR)
const GameCanvas = dynamic(() => import("@/components/canvas/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
      <span className="text-gray-600 text-sm">Loading canvas...</span>
    </div>
  ),
});

export default function Home() {
  const [gdd, setGdd] = useState<GameDesignDoc>(emptyGDD());
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });

  // Check MCP connection on mount
  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then(setMcpStatus)
      .catch(() => setMcpStatus({ connected: false, error: "Backend unreachable" }));
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0d1117] overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="h-10 flex-shrink-0 bg-[#16213e] border-b border-gray-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <span className="text-[#e94560] font-bold text-sm">Game Studio</span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                mcpStatus.connected ? "bg-[#53d769]" : "bg-[#e94560]"
              }`}
            />
            <span className="text-gray-500 text-[10px]">
              {mcpStatus.connected ? "Studio Connected" : "Studio Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                s === stage
                  ? s === 1
                    ? "bg-[#e94560]/20 text-[#e94560]"
                    : s === 2
                      ? "bg-[#53d769]/20 text-[#53d769]"
                      : "bg-[#5ac8fa]/20 text-[#5ac8fa]"
                  : "text-gray-600"
              }`}
            >
              {s === 1 ? "Ideate" : s === 2 ? "Design" : "Build"}
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas takes remaining space */}
        <div className="flex-1 relative">
          <GameCanvas />
        </div>

        {/* Chat panel - right sidebar, not floating */}
        <ChatPanel onStageChange={setStage} />
      </div>

      {/* GDD Bento Box - bottom bar */}
      <GDDBentoBox gdd={gdd} visible={true} />
    </div>
  );
}
