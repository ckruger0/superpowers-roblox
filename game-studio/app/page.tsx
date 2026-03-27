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
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });

  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then(setMcpStatus)
      .catch(() => setMcpStatus({ connected: false, error: "Backend unreachable" }));
  }, []);

  return (
    <div className="h-screen w-screen bg-neutral-950 overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="h-10 flex-shrink-0 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm tracking-tight">Game Studio</span>
          <div className="w-px h-4 bg-neutral-700" />
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                mcpStatus.connected ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="text-neutral-500 text-[11px]">
              {mcpStatus.connected ? "Studio Connected" : "Studio Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                s === stage
                  ? "bg-white/10 text-white"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              {s === 1 ? "Ideate" : s === 2 ? "Design" : "Build"}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GameCanvas />
        </div>
        <ChatPanel onStageChange={setStage} />
      </div>

      {/* GDD bottom bar */}
      <GDDBentoBox gdd={gdd} visible={true} />
    </div>
  );
}
