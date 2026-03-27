"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onStageChange?: (stage: 1 | 2 | 3) => void;
}

export default function ChatPanel({ onStageChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          skill: "new-game",
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

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
              // ignore parse errors
            }
          } else if (line.startsWith("data: ") && eventType === "tool_call") {
            try {
              const data = JSON.parse(line.slice(6));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          m.content + `\n\n*Using ${data.name}...*\n\n`,
                      }
                    : m
                )
              );
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Is Roblox Studio open?" }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="w-10 flex-shrink-0 bg-[#16213e] border-l border-gray-800 flex flex-col items-center justify-center gap-2 hover:bg-[#1a2744] transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-[#e94560] animate-pulse" />
        <span className="text-[#e94560] text-[9px] font-semibold [writing-mode:vertical-lr] rotate-180">
          Chat
        </span>
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 bg-[#16213e] border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#e94560] animate-pulse" />
          <span className="text-[#e94560] text-sm font-semibold">
            Creative Director
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          ▸
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-12 px-4 leading-relaxed">
            Tell me about the game you want to make!
            <br />
            <span className="text-gray-600 text-xs mt-2 block">
              Drag images onto the canvas for inspiration, then describe your idea here.
            </span>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === "user"
                ? "bg-[#1a1a2e] text-gray-300 ml-6"
                : "bg-[#0f3460] text-[#c8d6e5]"
            }`}
          >
            {msg.content || (
              <span className="text-gray-500 animate-pulse">Thinking...</span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-800">
        <div className="flex items-center gap-2 bg-[#0f3460] rounded-lg px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type your idea..."
            className="flex-1 bg-transparent text-[#c8d6e5] text-sm outline-none placeholder-gray-600"
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="text-[#e94560] hover:text-[#ff6b6b] disabled:text-gray-600 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
