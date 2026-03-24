---
name: visual-check
description: Use when you need to SEE the Roblox experience to answer a question — when spatial relationships, visual design, object placement, or "does this look right" matters. Also use proactively before giving spatial feedback.
---

# Visual Check

## Overview

Captures a screenshot of the Roblox Studio viewport with spatial metadata, so the AI can give feedback based on what the game actually LOOKS like — not just what the data model says.

**Core principle:** A screenshot without context is useless. Always capture metadata (camera position, visible objects, distances) alongside the image so you can reason about what you're seeing.

## When to Use

- Creator asks "does this look right?" or "how does this look?"
- You need to verify a spatial change you just made (moved an object, adjusted layout)
- Giving spatial-flow feedback and want to see sightlines
- Creator shares a screenshot and you need to compare against current state
- Before suggesting object placement — see the space first

## Process: Capture with Context

### Step 1: Determine What to Look At

Based on the conversation, decide:
- **What object(s)** need to be visible?
- **What context** is needed? (Just the object? The object + surroundings? The whole scene?)
- **What angle** tells the story? (Player's perspective from spawn? Bird's eye? Side view?)

### Step 2: Position the Camera

**Primary method: use `luau/smart-camera.luau`** — this handles bounding boxes, distance calculation, and wall avoidance automatically.

Read the script from `luau/smart-camera.luau`, then prepend `TARGET = "ObjectName"` before executing:

```lua
TARGET = "MysteryDoor"
-- [paste contents of luau/smart-camera.luau here]
```

The smart camera will:
1. Compute the full bounding box (even for complex Models)
2. Calculate the right distance to see the whole object
3. Try 8 different angles and pick the first one with clear line of sight (no walls blocking)
4. Return metadata about what it did

**Fallback patterns** (if smart-camera doesn't work for your situation):

**Player's perspective from spawn:**
```lua
local cam = workspace.CurrentCamera
local spawn = workspace:FindFirstChild("SpawnLocation")
cam.CFrame = spawn.CFrame * CFrame.new(0, 5, 0)
return "Camera at spawn perspective"
```

**Two objects in frame:**
```lua
local cam = workspace.CurrentCamera
local a = workspace:FindFirstChild("OBJECT_A").Position
local b = workspace:FindFirstChild("OBJECT_B").Position
local midpoint = (a + b) / 2
local dist = (a - b).Magnitude
local offset = Vector3.new(0, dist * 0.5, dist * 0.8)
cam.CFrame = CFrame.lookAt(midpoint + offset, midpoint)
return "Camera framing both objects"
```

**Bird's eye (always works, no wall issues):**
```lua
local cam = workspace.CurrentCamera
cam.CFrame = CFrame.lookAt(Vector3.new(0, 100, 0), Vector3.new(0, 0, 0))
return "Camera overhead"
```

### Step 3: Gather Metadata

Before capturing, get spatial context via `execute_luau`:

```lua
local cam = workspace.CurrentCamera
local out = {}
table.insert(out, "Camera pos: " .. tostring(cam.CFrame.Position))
table.insert(out, "Camera look: " .. tostring(cam.CFrame.LookVector))
table.insert(out, "FOV: " .. tostring(cam.FieldOfView))

-- Find objects near where the camera is looking
local rayResult = workspace:Raycast(cam.CFrame.Position, cam.CFrame.LookVector * 200)
if rayResult then
    table.insert(out, "Looking at: " .. rayResult.Instance.Name .. " at distance " .. math.floor(rayResult.Distance))
end

-- List nearby objects with distances from camera
local nearby = {}
for _, desc in workspace:GetChildren() do
    if desc:IsA("BasePart") or desc:IsA("Model") then
        local pos
        if desc:IsA("Model") then
            local p = desc.PrimaryPart or desc:FindFirstChildWhichIsA("BasePart")
            if p then pos = p.Position end
        else
            pos = desc.Position
        end
        if pos then
            local dist = (pos - cam.CFrame.Position).Magnitude
            if dist < 100 then
                table.insert(nearby, {name = desc.Name, dist = math.floor(dist)})
            end
        end
    end
end
table.sort(nearby, function(a, b) return a.dist < b.dist end)

table.insert(out, "\nVisible objects (within 100 studs):")
for i, obj in nearby do
    if i <= 15 then
        table.insert(out, "  " .. obj.name .. " — " .. obj.dist .. " studs")
    end
end

return table.concat(out, "\n")
```

### Step 4: Capture Screenshot

Use the **`screen_capture`** MCP tool to capture the Roblox Studio viewport. This returns the image directly — no file paths or shell commands needed.

```
screen_capture()
```

### Step 5: Analyze Image + Metadata Together

When analyzing, you have:
1. **The screenshot** — what the game actually looks like
2. **The metadata** — camera position, what objects are nearby, distances
3. **The conversation context** — what the creator asked about

Combine all three. Don't just describe what you see — answer the creator's question using visual evidence.

## Camera Presets

For common situations, use these preset angles:

| Situation | Camera Setup |
|-----------|-------------|
| "Does this look right?" | Frame the specific object at 3/4 view |
| "Can the player see X from Y?" | Position camera at Y, look toward X |
| Spawn review | Camera at spawn position + head height, facing spawn direction |
| Overview | Bird's eye, high up, looking down |
| Two objects' relationship | Midpoint between them, pulled back to see both |
| Before/after comparison | Same camera position, capture both states |

## Key Principles

- **Always capture metadata alongside the image.** The screenshot alone isn't enough — you need to know what you're looking at.
- **Frame the shot for the question.** "Does the door look clickable?" needs a close-up of the door. "Is the layout confusing?" needs an overview.
- **The player's perspective matters most.** When in doubt, position the camera where the player would be.
- **Multiple angles tell a better story.** If one shot isn't clear, take another from a different angle.
- **Search before you guess** on Roblox-specific camera/capture issues.
