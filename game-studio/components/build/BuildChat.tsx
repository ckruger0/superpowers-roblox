"use client";

import { useState, useRef, useEffect } from "react";
import type { GameDesignDoc } from "@/lib/types";
import { palette } from "@/lib/themes";
import Markdown from "@/components/shared/Markdown";

const friendlyToolNames: Record<string, string> = {
  search_game_tree: "Looking around the game...",
  inspect_instance: "Checking out an object...",
  script_grep: "Searching through scripts...",
  script_read: "Reading a script...",
  execute_luau: "Running some code in Studio...",
  insert_from_creator_store: "Finding an asset to place...",
  screen_capture: "Taking a screenshot...",
  generate_mesh: "Creating a custom 3D object...",
  start_stop_play: "Toggling play mode...",
  character_navigation: "Moving the character...",
  keyboard_input: "Pressing some keys...",
  mouse_input: "Clicking something...",
  console_output: "Checking the console...",
};

function friendlyToolMessage(toolName: string): string {
  return friendlyToolNames[toolName] ?? `Working on something...`;
}

interface BuildMessage {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  type: "text" | "screenshot" | "approval" | "status";
  imageUrl?: string;
}

interface BuildChatProps {
  gdd: GameDesignDoc;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
}

export default function BuildChat({ gdd, autoStart, onAutoStartConsumed }: BuildChatProps) {
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-start building when navigated from the Ready modal
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !hasStarted && !isBuilding && !autoStartedRef.current) {
      autoStartedRef.current = true;
      onAutoStartConsumed?.();
      startBuild();
    }
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = (msg: Omit<BuildMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  };

  const startBuild = async () => {
    setHasStarted(true);
    setIsBuilding(true);

    addMessage({
      role: "system",
      content: "Build started. Connecting to Roblox Studio...",
      type: "status",
    });

    const gddSummary = [
      gdd.vision.content && `Vision: ${gdd.vision.content}`,
      gdd.mechanics.content && `Mechanics: ${gdd.mechanics.content}`,
      gdd.narrative.content && `Narrative: ${gdd.narrative.content}`,
      gdd.levelPlan.content && `Level Plan: ${gdd.levelPlan.content}`,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are building a Roblox game based on this game design document:

${gddSummary || "No game design document yet — ask the user what to build."}

You have access to Roblox Studio via MCP tools. Build the game step by step:
1. Start with the spawn area
2. Build each room/section one at a time
3. After each major step, take a screenshot and ask "Does this look right?"
4. Use Creator Store assets for everything except structural geometry

For EVERY step, describe what you're about to do, do it, screenshot the result, and ask for approval before moving on.

Keep messages concise. Show your work visually.`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: systemPrompt + "\n\nStart building the game. Begin with the spawn area." }],
          skill: "new-game",
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", type: "text" },
      ]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (eventType === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + data.text }
                      : m
                  )
                );
              } else if (eventType === "tool_call") {
                addMessage({
                  role: "system",
                  content: friendlyToolMessage(data.name),
                  type: "status",
                });

              } else if (eventType === "tool_result") {
                if (data.name === "screen_capture" && data.result) {
                  const result = data.result;
                  const imageUrl = result?.imageUrl ?? null;
                  if (imageUrl) {
                    addMessage({
                      role: "assistant",
                      content: "",
                      type: "screenshot",
                      imageUrl,
                    });
                  }
                }
              }
            } catch {
              // partial chunk
            }
          }
        }
      }
    } catch (error) {
      addMessage({
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        type: "status",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const sendReply = async (text: string) => {
    if (!text.trim() || isBuilding) return;

    addMessage({ role: "user", content: text, type: "text" });
    setInput("");
    setIsBuilding(true);

    const allMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    allMessages.push({ role: "user", content: text });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          skill: "new-game",
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", type: "text" },
      ]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType === "text") {
            try {
              const data = JSON.parse(line.slice(6));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.text }
                    : m
                )
              );
            } catch {
              // partial
            }
          } else if (line.startsWith("data: ") && eventType === "tool_call") {
            try {
              const data = JSON.parse(line.slice(6));
              addMessage({
                role: "system",
                content: friendlyToolMessage(data.name),
                type: "status",
              });
            } catch {
              // partial
            }
          }
        }
      }
    } catch (error) {
      addMessage({
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        type: "status",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const hasGdd =
    gdd.vision.status !== "empty" || gdd.mechanics.status !== "empty";

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: palette.bg }}>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
          {!hasStarted && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4 opacity-30">🔨</div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: palette.textPrimary }}>
                Ready to Build
              </h2>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: palette.textMuted }}>
                {hasGdd
                  ? "The AI will build your game step by step in Roblox Studio, showing you screenshots along the way."
                  : "Head to the Ideate tab first to brainstorm your game idea. Once you have a design, come back here to build it."}
              </p>
              {hasGdd && (
                <button
                  onClick={startBuild}
                  className="px-6 py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: palette.accent }}
                >
                  Start Building
                </button>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "status" && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: palette.accent }} />
                  <span className="text-xs" style={{ color: palette.textFaint }}>{msg.content}</span>
                </div>
              )}

              {msg.type === "text" && msg.role === "assistant" && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
                >
                  {msg.content ? (
                    <Markdown content={msg.content} />
                  ) : (
                    <p className="text-sm animate-pulse" style={{ color: palette.textFaint }}>
                      Thinking...
                    </p>
                  )}
                </div>
              )}

              {msg.type === "text" && msg.role === "user" && (
                <div className="flex justify-end">
                  <div
                    className="rounded-xl px-4 py-2 max-w-md"
                    style={{ backgroundColor: palette.accentBg, border: `1px solid ${palette.accent}40` }}
                  >
                    <p className="text-sm" style={{ color: palette.accentText }}>{msg.content}</p>
                  </div>
                </div>
              )}

              {msg.type === "screenshot" && msg.imageUrl && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${palette.borderLight}` }}
                >
                  <img
                    src={msg.imageUrl}
                    alt="Roblox Studio screenshot"
                    className="w-full"
                  />
                  <div className="p-3" style={{ backgroundColor: palette.bgCard }}>
                    <span className="text-xs" style={{ color: palette.textFaint }}>
                      Screenshot from Roblox Studio
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      {hasStarted && (
        <div className="p-4" style={{ borderTop: `1px solid ${palette.borderLight}` }}>
          <div className="max-w-2xl mx-auto">
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 transition-colors"
              style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendReply(input)
                }
                placeholder={
                  isBuilding
                    ? "AI is building..."
                    : "Give feedback or say what to change..."
                }
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: palette.textPrimary }}
                disabled={isBuilding}
              />
              <button
                onClick={() => sendReply(input)}
                disabled={isBuilding || !input.trim()}
                className="transition-colors"
                style={{ color: !input.trim() || isBuilding ? palette.textFaint : palette.accentDark }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
