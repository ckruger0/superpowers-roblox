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
For EACH object, follow ALL of these sub-steps. Do not skip any.

**1a. Insert from Creator Store:**
\`insert_from_creator_store\` with a VERY SPECIFIC query. Use descriptive terms:
- GOOD: "single pine tree low poly", "wooden barrel medieval", "campfire with logs"
- BAD: "winter pack", "forest", "nature", "decorations" (these return massive packs!)

**1b. IMMEDIATELY inspect what was inserted:**
\`\`\`lua
local CS = game:GetService("CollectionService")
local tagged = CS:GetTagged("Assistant:<GUID>")
if #tagged > 0 then
    local obj = tagged[1]
    local partCount = 0
    local min = Vector3.new(math.huge,math.huge,math.huge)
    local max = Vector3.new(-math.huge,-math.huge,-math.huge)
    for _, d in obj:GetDescendants() do
        if d:IsA("BasePart") then
            partCount += 1
            local p, h = d.Position, d.Size/2
            min = Vector3.new(math.min(min.X,p.X-h.X),math.min(min.Y,p.Y-h.Y),math.min(min.Z,p.Z-h.Z))
            max = Vector3.new(math.max(max.X,p.X+h.X),math.max(max.Y,p.Y+h.Y),math.max(max.Z,p.Z+h.Z))
        end
    end
    local size = max - min
    return string.format("Name: %s | Parts: %d | Size: %.0fx%.0fx%.0f | Children: %d",
        obj.Name, partCount, size.X, size.Y, size.Z, #obj:GetChildren())
end
\`\`\`

**1c. REJECT if it's a pack or too large:**
- If partCount > 50 → it's probably an asset PACK. DELETE IT and search again with more specific terms.
- If size is > 100 studs in any dimension → it's probably a full scene. DELETE IT.
- If it has many top-level children (>10) → likely a collection. DELETE IT.

To delete: \`tagged[1]:Destroy()\`

**1d. Sanitize scripts:**
\`\`\`lua
local CS = game:GetService("CollectionService")
local tagged = CS:GetTagged("Assistant:<GUID>")
if #tagged > 0 then
    local obj = tagged[1]
    local removed = 0
    for _, d in obj:GetDescendants() do
        if d:IsA("BaseScript") then d:Destroy(); removed += 1 end
    end
    return "Removed " .. removed .. " scripts"
end
\`\`\`

**1e. ANCHOR all parts (CRITICAL — prevents physics chaos):**
\`\`\`lua
local CS = game:GetService("CollectionService")
local tagged = CS:GetTagged("Assistant:<GUID>")
if #tagged > 0 then
    local obj = tagged[1]
    local anchored = 0
    for _, d in obj:GetDescendants() do
        if d:IsA("BasePart") and not d.Anchored then
            d.Anchored = true
            anchored += 1
        end
    end
    return "Anchored " .. anchored .. " parts"
end
\`\`\`

**1f. Position it RELATIVE to existing objects** — run this layout helper FIRST:

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

### Step 2: FULL SCENE AUDIT (run BEFORE screenshot)

After placing a batch, run this comprehensive check on THE ENTIRE SCENE — not just individual objects:

\`\`\`lua
local out = {}
local issues = 0

-- Collect all placed objects with bounding boxes
local objects = {}
for _, child in workspace:GetChildren() do
    if (child:IsA("Model") or child:IsA("BasePart")) and child.Name ~= "Terrain" and child.Name ~= "Baseplate" then
        local min = Vector3.new(math.huge,math.huge,math.huge)
        local max = Vector3.new(-math.huge,-math.huge,-math.huge)
        local parts = {}
        if child:IsA("Model") then
            for _, d in child:GetDescendants() do if d:IsA("BasePart") then table.insert(parts, d) end end
        else table.insert(parts, child) end
        for _, p in parts do
            local pos, half = p.Position, p.Size/2
            min = Vector3.new(math.min(min.X,pos.X-half.X),math.min(min.Y,pos.Y-half.Y),math.min(min.Z,pos.Z-half.Z))
            max = Vector3.new(math.max(max.X,pos.X+half.X),math.max(max.Y,pos.Y+half.Y),math.max(max.Z,pos.Z+half.Z))
        end
        if #parts > 0 then
            table.insert(objects, {name=child.Name, min=min, max=max, size=max-min, partCount=#parts})
        end
    end
end

-- Check each object
for _, obj in objects do
    -- Floating check
    if obj.min.Y > 3 then
        issues += 1
        table.insert(out, "FLOATING: " .. obj.name .. " bottom at Y=" .. string.format("%.1f", obj.min.Y))
    end
    -- Buried check
    if obj.min.Y < -1 then
        issues += 1
        table.insert(out, "BURIED: " .. obj.name .. " sunk by " .. string.format("%.1f", -obj.min.Y))
    end
    -- Giant object check (probably an asset pack)
    if obj.size.X > 80 or obj.size.Y > 80 or obj.size.Z > 80 then
        issues += 1
        table.insert(out, "TOO BIG: " .. obj.name .. " size " .. string.format("%.0fx%.0fx%.0f", obj.size.X, obj.size.Y, obj.size.Z) .. " (asset pack?)")
    end
    -- Too many parts (asset pack indicator)
    if obj.partCount > 100 then
        issues += 1
        table.insert(out, "PACK?: " .. obj.name .. " has " .. obj.partCount .. " parts — might be an asset pack, not a single item")
    end
end

-- Check overlaps between objects
for i = 1, #objects do
    for j = i+1, #objects do
        local a, b = objects[i], objects[j]
        local overlap = a.min.X < b.max.X and a.max.X > b.min.X and
                        a.min.Y < b.max.Y and a.max.Y > b.min.Y and
                        a.min.Z < b.max.Z and a.max.Z > b.min.Z
        if overlap then
            issues += 1
            table.insert(out, "OVERLAP: " .. a.name .. " and " .. b.name .. " bounding boxes intersect")
        end
    end
end

-- Check spawn area clearance
local spawn = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
if spawn then
    local spawnPos = spawn.Position
    local blocked = 0
    for _, obj in objects do
        if obj.name ~= "SpawnLocation" then
            local dist = math.sqrt((spawnPos.X - (obj.min.X+obj.max.X)/2)^2 + (spawnPos.Z - (obj.min.Z+obj.max.Z)/2)^2)
            if dist < 5 and obj.min.Y < spawnPos.Y + 6 then
                blocked += 1
                table.insert(out, "SPAWN BLOCKED: " .. obj.name .. " is " .. string.format("%.0f", dist) .. " studs from spawn")
            end
        end
    end
end

table.insert(out, "\\nTotal objects: " .. #objects .. " | Issues: " .. issues)
return table.concat(out, "\\n")
\`\`\`

**FIX ALL ISSUES before proceeding:**
- **FLOATING** → PivotTo lower Y to sit on floor
- **BURIED** → PivotTo raise Y
- **TOO BIG / PACK** → \`object:Destroy()\` and search for a more specific single item
- **OVERLAP** → PivotTo move one object away. Leave at least 5 studs between objects.
- **SPAWN BLOCKED** → Move the blocking object away from spawn. Players need clear space to spawn and orient themselves.

If issues > 3, something is seriously wrong. Consider deleting problematic objects and trying different Creator Store searches.

### Step 3: Screenshot + CRITICAL visual review
Take \`screen_capture\`. Be BRUTALLY HONEST — do NOT say "looks great" unless it actually does. Ask yourself:
- Can a player (~5 studs tall) physically WALK through this scene without getting stuck?
- Is the spawn area CLEAR? (10+ studs of open space around spawn)
- Are objects the right scale? (A tree should not be the same size as a chair)
- Is anything piled on top of other things? (This means overlapping bounding boxes — fix it)
- Does the scene look cluttered or chaotic? (If yes, DELETE some objects — less is more)
- Is this a PLAYABLE space or just a diorama? (A player needs paths to move through)

**If the scene looks cluttered: STOP ADDING THINGS. Delete overlapping/redundant objects first.**

If issues: fix via \`execute_luau\`, re-run the scene audit, then screenshot again. Max 2 fix rounds per batch.

### Step 4: Move to next batch
Describe what you built, then IMMEDIATELY start the next batch. Don't wait.

## Build Order
1. **Ground/terrain** — the floor everything sits on. SpawnLocation.
2. **Spatial anchors** — walls, boundaries, major landmarks that define the space
3. **Essential objects** — the hero pieces (the main gameplay objects)
4. **Atmosphere** — scenery, lighting, particles, decorations
5. **Core game scripts** — mechanics, win/lose, UI (see scripting section below)
6. **Polish scripts** — sound effects, particles on events, animations

## SCRIPTING — Every Game Needs These

After the world is built, ALWAYS create scripts for the full gameplay loop. Don't stop at placing objects — a game without scripts is just a diorama. Think about the COMPLETE player experience from spawn to win/lose.

### Script Architecture — What Goes Where
- **ServerScriptService** → Server scripts that manage game state, scoring, round logic
- **StarterPlayerScripts** → Client scripts for UI, camera, input
- **StarterGui** → ScreenGuis for HUD, win/lose screens, score display
- **Workspace (in parts)** → Scripts on specific objects for interactions (Touched events, ClickDetectors)

### Every Game MUST Have:
1. **A win condition** — what does the player achieve? Reaching a goal, collecting all items, surviving a timer, etc. This needs BOTH a detection script AND a visible reward (UI message, celebration effect).
2. **A lose condition** (if applicable) — falling into void, health reaching 0, timer running out. Must respawn the player or show a "Try Again" screen.
3. **Player feedback UI** — the player must always know:
   - What they're trying to do (objective display)
   - How they're doing (score, health, progress bar, timer)
   - When they win or lose (big clear message + what to do next)

### Common Script Patterns — Use These

**Win zone (player touches a goal):**
\`\`\`lua
-- Server Script in the goal part
local goal = script.Parent
goal.Touched:Connect(function(hit)
    local player = game.Players:GetPlayerFromCharacter(hit.Parent)
    if player then
        -- Fire to client for UI
        game.ReplicatedStorage.WinEvent:FireClient(player)
    end
end)
\`\`\`

**Win screen UI (client-side):**
\`\`\`lua
-- LocalScript in StarterPlayerScripts
local event = game.ReplicatedStorage:WaitForChild("WinEvent")
event.OnClientEvent:Connect(function()
    local gui = player.PlayerGui:WaitForChild("WinScreen")
    gui.Enabled = true
    -- Optional: play sound, show confetti
end)
\`\`\`

**Kill zone (lava, void, hazard):**
\`\`\`lua
-- Script in the hazard part
script.Parent.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid then humanoid.Health = 0 end
end)
\`\`\`

**Collectibles (coins, gems, items):**
\`\`\`lua
-- Script in each collectible
local collected = false
script.Parent.Touched:Connect(function(hit)
    if collected then return end
    local player = game.Players:GetPlayerFromCharacter(hit.Parent)
    if player then
        collected = true
        script.Parent:Destroy()
        local ls = player:FindFirstChild("leaderstats")
        if ls then ls.Coins.Value += 1 end
    end
end)
\`\`\`

**Leaderstats (score/coins):**
\`\`\`lua
-- Script in ServerScriptService
game.Players.PlayerAdded:Connect(function(player)
    local ls = Instance.new("Folder")
    ls.Name = "leaderstats"
    ls.Parent = player
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Parent = ls
end)
\`\`\`

**Checkpoint system:**
\`\`\`lua
-- Script in each checkpoint part
script.Parent.Touched:Connect(function(hit)
    local player = game.Players:GetPlayerFromCharacter(hit.Parent)
    if player then
        player.RespawnLocation = script.Parent -- must be a SpawnLocation
    end
end)
\`\`\`

**Timer (countdown):**
\`\`\`lua
-- Script in ServerScriptService
local timeLeft = Instance.new("IntValue")
timeLeft.Name = "TimeLeft"
timeLeft.Value = 60
timeLeft.Parent = game.ReplicatedStorage

while timeLeft.Value > 0 do
    task.wait(1)
    timeLeft.Value -= 1
end
-- Time's up — handle lose condition
\`\`\`

**Simple HUD (score + timer display):**
Create via execute_luau: a ScreenGui in StarterGui with TextLabels that bind to leaderstats and ReplicatedStorage values.

### Scripting Checklist — Run Through This After World Build
Ask yourself for EACH mechanic in the GDD:
1. Does the player know what to do? (objective visible on screen)
2. Can the player DO it? (interactions scripted — Touched, ClickDetector, ProximityPrompt)
3. Does something happen when they do it? (feedback — sound, particles, score change, UI update)
4. Is there an end state? (win screen, level complete, "play again" option)
5. Can the player fail? (death → respawn, or game over screen)

### How to Create Scripts via MCP
Use \`execute_luau\` to create and parent scripts:
\`\`\`lua
local script = Instance.new("Script")
script.Name = "WinZone"
script.Source = [[
    -- script code here
]]
script.Parent = workspace.GoalPart
return "Created WinZone script"
\`\`\`

For client scripts (LocalScripts), parent them to StarterPlayerScripts:
\`\`\`lua
local ls = Instance.new("LocalScript")
ls.Name = "WinScreenHandler"
ls.Source = [[
    -- client code here
]]
ls.Parent = game.StarterPlayer.StarterPlayerScripts
return "Created client script"
\`\`\`

For ScreenGuis, create in StarterGui:
\`\`\`lua
local sg = Instance.new("ScreenGui")
sg.Name = "GameHUD"
sg.Parent = game.StarterGui

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0, 200, 0, 50)
label.Position = UDim2.new(0.5, -100, 0, 10)
label.Text = "Score: 0"
label.TextColor3 = Color3.new(1,1,1)
label.BackgroundTransparency = 0.5
label.BackgroundColor3 = Color3.new(0,0,0)
label.Font = Enum.Font.GothamBold
label.TextSize = 24
label.Parent = sg
return "Created HUD"
\`\`\`

For RemoteEvents (server↔client communication):
\`\`\`lua
local re = Instance.new("RemoteEvent")
re.Name = "WinEvent"
re.Parent = game.ReplicatedStorage
return "Created WinEvent"
\`\`\`

### IMPORTANT: Script Creation Order
1. RemoteEvents first (in ReplicatedStorage) — other scripts depend on these
2. Server scripts (ServerScriptService) — game state, leaderstats, round logic
3. Object scripts (in workspace parts) — Touched events, interactions
4. Client scripts (StarterPlayerScripts) — UI handlers, camera
5. GUI elements (StarterGui) — ScreenGuis, TextLabels, buttons

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
