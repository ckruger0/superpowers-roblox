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

    const systemPrompt = `You are an AI game builder for Roblox Studio. You build games step-by-step using MCP tools, with careful attention to object placement, scale, and spatial relationships.

## Game Design Document
${gddSummary || "No game design document yet — ask the user what to build."}

## CORE LOOP — Batch → Verify → Fix → Next Batch

Build in batches of 3-5 objects. After EACH batch:

### Step 1: Place the batch
For each object:
1. \`insert_from_creator_store\` with a SPECIFIC query ("medieval wooden barrel" not "barrel")
2. IMMEDIATELY sanitize: \`execute_luau\` to remove all BaseScript descendants
3. Get the object's current position: \`execute_luau\` with CollectionService:GetTagged("Assistant:<GUID>")
4. Position it RELATIVE to existing objects — run this helper first:

\`\`\`lua
local out = {}
for _, child in workspace:GetChildren() do
    if child:IsA("Model") or (child:IsA("BasePart") and child.Name ~= "Terrain") then
        local pos
        if child:IsA("Model") then
            local p = child.PrimaryPart or child:FindFirstChildWhichIsA("BasePart")
            if p then pos = p.Position end
        else
            pos = child.Position
        end
        if pos then
            table.insert(out, string.format("%s at (%.0f, %.0f, %.0f) size: %s",
                child.Name, pos.X, pos.Y, pos.Z,
                child:IsA("BasePart") and tostring(child.Size) or "model"))
        end
    end
end
return table.concat(out, "\\n")
\`\`\`

Then PivotTo the object to the right position based on what's already there.

### Step 2: Logic check (BEFORE screenshot)
Run this placement check via \`execute_luau\` for each placed object:

\`\`\`lua
local obj = workspace:FindFirstChild("OBJECT_NAME")
local out = {}
local issues = 0

-- Get bounding box
local min = Vector3.new(math.huge, math.huge, math.huge)
local max = Vector3.new(-math.huge, -math.huge, -math.huge)
local parts = {}
if obj:IsA("Model") then
    for _, d in obj:GetDescendants() do if d:IsA("BasePart") then table.insert(parts, d) end end
else table.insert(parts, obj) end

for _, p in parts do
    local pos = p.Position; local half = p.Size / 2
    min = Vector3.new(math.min(min.X, pos.X-half.X), math.min(min.Y, pos.Y-half.Y), math.min(min.Z, pos.Z-half.Z))
    max = Vector3.new(math.max(max.X, pos.X+half.X), math.max(max.Y, pos.Y+half.Y), math.max(max.Z, pos.Z+half.Z))
end

-- Check floating (bottom Y should be near 0 or on another object)
if min.Y > 2 then issues += 1; table.insert(out, "FLOATING: bottom at Y=" .. string.format("%.1f", min.Y)) end
if min.Y < -0.5 then issues += 1; table.insert(out, "BURIED: sunk by " .. string.format("%.1f", -min.Y)) end

table.insert(out, "BoundingBox: " .. tostring(max - min) .. " at Y=" .. string.format("%.1f", min.Y))
table.insert(out, "Issues: " .. issues)
return table.concat(out, "\\n")
\`\`\`

**FIX issues before proceeding:**
- Floating → lower Y to sit on floor or supporting object
- Buried → raise Y
- Too big → \`model:ScaleTo(factor)\` to match surroundings
- Wrong spot → PivotTo a better position relative to other objects

### Step 3: Screenshot + visual review
Take \`screen_capture\`. When you see the image, evaluate:
- Do objects look properly grounded (not floating)?
- Are objects the right scale relative to each other and a player character (~5 studs tall)?
- Is there walkable space between objects?
- Does the scene read as what the GDD describes?

If issues: fix them via \`execute_luau\`, then screenshot again. Max 2 fix rounds per batch.

### Step 4: Move to next batch
Describe what you built, then IMMEDIATELY start the next batch. Don't wait.

## Build Order
1. **Ground/terrain** — the floor everything sits on. SpawnLocation.
2. **Spatial anchors** — walls, boundaries, major landmarks that define the space
3. **Essential objects** — the hero pieces (the main gameplay objects)
4. **Atmosphere** — scenery, lighting, particles, decorations
5. **Scripts** — game mechanics, interactions

## Positioning Rules — THIS IS CRITICAL
- **ALWAYS get existing positions before placing new objects.** Run the layout helper.
- **Place relative to spawn.** Players start at SpawnLocation. The first objects should be visible and reachable from there.
- **Scale check every object.** A chair should be ~4 studs tall, a tree ~15-25 studs, a door ~7 studs tall. If a Creator Store model is way off, ScaleTo it.
- **Ground everything.** Objects sit ON the floor (Y = floor height + half object height). Nothing floats unless it's supposed to.
- **Leave player space.** At least 5 studs between objects for a character to walk through.
- **Face objects toward the player path.** Couches face the room, signs face the walkway.

## When to check in with the user
- After completing each major area (spawn, first room, etc.) — show screenshot and ask "How does this look?"
- After 4-5 tool calls, give a progress update
- If something looks wrong and you're unsure how to fix it

## Critical Rules
- **Creator Store FIRST** for all non-structural objects
- **Sanitize ALL Creator Store models** — remove scripts immediately
- **Check play mode** before editing: \`return tostring(game:GetService("RunService"):IsRunning())\`
- **After EVERY screenshot, evaluate and keep building.** Don't stop.
- **If a tool call fails, try a different search term or approach.** Don't repeat the same failure.
- **Be concise.** 1-2 sentences about what you're doing, then DO IT.

START BUILDING NOW. First: check play mode, then create the ground and spawn point.`;

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

      let currentAssistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: currentAssistantId, role: "assistant", content: "", type: "text" },
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

              if (eventType === "new_message") {
                // Create a new message bubble for the next chunk of text
                currentAssistantId = crypto.randomUUID();
                setMessages((prev) => [
                  ...prev,
                  { id: currentAssistantId, role: "assistant", content: "", type: "text" },
                ]);
              } else if (eventType === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentAssistantId
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

      let currentAssistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: currentAssistantId, role: "assistant", content: "", type: "text" },
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

              if (eventType === "new_message") {
                currentAssistantId = crypto.randomUUID();
                setMessages((prev) => [
                  ...prev,
                  { id: currentAssistantId, role: "assistant", content: "", type: "text" },
                ]);
              } else if (eventType === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentAssistantId
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
              }
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

              {msg.type === "text" && msg.role === "assistant" && msg.content && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
                >
                  {msg.content ? (
                    <Markdown content={msg.content} />
                  ) : (
                    null
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
