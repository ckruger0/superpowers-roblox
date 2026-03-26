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

  const showGdd =
    gdd.vision.status !== "empty" ||
    gdd.mechanics.status !== "empty";

  return (
    <div className="h-screen w-screen bg-[#0d1117] overflow-hidden relative">
      {/* Connection status indicator */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-[#16213e] rounded-full px-3 py-1.5 border border-gray-700/50">
        <div
          className={`w-2 h-2 rounded-full ${
            mcpStatus.connected ? "bg-[#53d769]" : "bg-[#e94560]"
          }`}
        />
        <span className="text-gray-400 text-xs">
          {mcpStatus.connected ? "Studio Connected" : "Studio Disconnected"}
        </span>
      </div>

      {/* Stage indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-[#16213e] rounded-full px-3 py-1.5 border border-gray-700/50">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              s === stage
                ? s === 1
                  ? "bg-[#e94560]"
                  : s === 2
                    ? "bg-[#53d769]"
                    : "bg-[#5ac8fa]"
                : "bg-gray-700"
            }`}
          />
        ))}
        <span className="text-gray-500 text-xs ml-1">
          {stage === 1 ? "Ideate" : stage === 2 ? "Design" : "Build"}
        </span>
      </div>

      {/* Main canvas */}
      <GameCanvas />

      {/* AI Chat panel */}
      <ChatPanel onStageChange={setStage} />

      {/* GDD Bento Box */}
      <GDDBentoBox gdd={gdd} visible={showGdd} />
    </div>
  );
}
