"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
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
  const [mcpStatus, setMcpStatus] = useState<McpStatus>({ connected: false });

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
      {/* Minimal top bar */}
      <div className="h-9 flex-shrink-0 bg-neutral-900/80 border-b border-neutral-800/50 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <span className="text-neutral-300 font-medium text-xs tracking-tight">
            Game Studio
          </span>
          <div className="w-px h-3.5 bg-neutral-800" />
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                mcpStatus.connected ? "bg-emerald-400" : "bg-neutral-600"
              }`}
            />
            <span className="text-neutral-600 text-[10px]">
              {mcpStatus.connected ? "Studio" : "No Studio"}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas fills everything */}
      <div className="flex-1 overflow-hidden relative">
        <GameCanvas onGddUpdate={handleGddUpdate} gdd={gdd} />
      </div>

      {/* GDD bottom bar */}
      <GDDBentoBox gdd={gdd} visible={true} />
    </div>
  );
}
