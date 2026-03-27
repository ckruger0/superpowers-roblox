"use client";

import { useState, useRef, useEffect } from "react";
import type { GameDesignDoc } from "@/lib/types";

interface BuildMessage {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  type: "text" | "screenshot" | "approval" | "status";
  imageUrl?: string;
  approvalButtons?: { label: string; value: string }[];
}

interface BuildChatProps {
  gdd: GameDesignDoc;
}

export default function BuildChat({ gdd }: BuildChatProps) {
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    // Build the GDD summary for the AI
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
                  content: `Using ${data.name}...`,
                  type: "status",
                });

                // If it's a screenshot, we'll get the result next
                if (data.name === "screen_capture") {
                  addMessage({
                    role: "system",
                    content: "Capturing screenshot...",
                    type: "status",
                  });
                }
              } else if (eventType === "tool_result") {
                // Check if this is a screenshot result
                if (data.name === "screen_capture" && data.result) {
                  const resultStr = typeof data.result === "string" ? data.result : JSON.stringify(data.result);
                  // Look for base64 image data in the result
                  const imageMatch = resultStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
                  if (imageMatch) {
                    addMessage({
                      role: "assistant",
                      content: "",
                      type: "screenshot",
                      imageUrl: imageMatch[0],
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
                content: `Using ${data.name}...`,
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
    <div className="w-full h-full flex flex-col bg-[#ece3d5]">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
          {!hasStarted && (
            <div className="text-center py-20">
              <div className="text-[#b0a08a] text-4xl mb-4">🔨</div>
              <h2 className="text-[#3d2e1e] text-lg font-semibold mb-2">
                Ready to Build
              </h2>
              <p className="text-[#8a7a60] text-sm mb-6 max-w-sm mx-auto">
                {hasGdd
                  ? "The AI will build your game step by step in Roblox Studio, showing you screenshots along the way."
                  : "Head to the Ideate tab first to brainstorm your game idea. Once you have a design, come back here to build it."}
              </p>
              {hasGdd && (
                <button
                  onClick={startBuild}
                  className="px-6 py-2.5 bg-[#d4a054] hover:bg-[#c89040] text-white text-sm font-medium rounded-lg transition-colors"
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
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4a054] animate-pulse" />
                  <span className="text-[#8a7a60] text-xs">{msg.content}</span>
                </div>
              )}

              {msg.type === "text" && msg.role === "assistant" && (
                <div className="bg-[#f5f0ea] border border-[#e8dcc8] rounded-xl p-4">
                  <p className="text-[#3d2e1e] text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content || (
                      <span className="text-[#a09070] animate-pulse">
                        Thinking...
                      </span>
                    )}
                  </p>
                </div>
              )}

              {msg.type === "text" && msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-[#d4a054]/10 border border-[#d4a054]/30 rounded-xl px-4 py-2 max-w-md">
                    <p className="text-[#3d2e1e] text-sm">{msg.content}</p>
                  </div>
                </div>
              )}

              {msg.type === "screenshot" && msg.imageUrl && (
                <div className="bg-[#f5f0ea] border border-[#e8dcc8] rounded-xl overflow-hidden">
                  <img
                    src={msg.imageUrl}
                    alt="Roblox Studio screenshot"
                    className="w-full rounded-t-xl"
                  />
                  <div className="p-3 flex items-center gap-2">
                    <span className="text-[#8a7a60] text-xs">
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
        <div className="border-t border-[#e8dcc8] p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-[#f5f0ea] border border-[#e8dcc8] rounded-xl px-4 py-3 focus-within:border-[#d4a054]/40 transition-colors">
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
                className="flex-1 bg-transparent text-[#3d2e1e] text-sm outline-none placeholder-neutral-600"
                disabled={isBuilding}
              />
              <button
                onClick={() => sendReply(input)}
                disabled={isBuilding || !input.trim()}
                className="text-[#d4a054] hover:text-[#c89040] disabled:text-[#b0a08a] transition-colors"
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
