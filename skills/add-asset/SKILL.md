---
name: add-asset
description: Use when you need to find and insert a specific object from the Roblox Creator Store into the scene — e.g. "add a chair", "put a tree near the spawn", "I need a sports car"
---

# Add Asset

## Overview

Atomic skill: search the Roblox Creator Store for an object by description, insert it into the scene, and position it. Used standalone or as a building block by `build-scene`.

## Process

### Step 1: Check Play Mode

Before inserting, ALWAYS check:
```lua
return tostring(game:GetService("RunService"):IsRunning())
```
If `true`, warn the user and stop.

### Step 2: Insert from Creator Store

Use the **`insert_from_creator_store`** MCP tool. This single call searches the Creator Store AND inserts the model into the scene:

```
insert_from_creator_store(query="wooden dining chair")
```

**Key behavior:**
- Searches the Creator Store for the query and inserts the best match
- Returns a **GUID tag** — use `CollectionService:GetTagged("Assistant:<GUID>")` to reference the inserted model later via `execute_luau`
- Returns **alternative asset IDs** if you need to try different models
- Supports a `tag` parameter to **clone a previously-inserted model** instead of searching again

Use specific, concrete search terms:
- "living room couch" not "furniture"
- "oak tree" not "nature"
- "sports car" not "vehicle"

**If the first result isn't right:**
- The tool returns alternative asset IDs — try those
- Or run `insert_from_creator_store` again with a different query

### Step 3: SANITIZE the Model (REQUIRED)

<HARD-RULE>
After inserting ANY Creator Store model, IMMEDIATELY remove all scripts from it. The `insert_from_creator_store` tool does NOT sanitize scripts. Creator Store free models frequently contain malicious scripts — backdoors, obfuscated loaders, and code that tries to enable HttpService and load remote payloads. We have seen this repeatedly in practice.
</HARD-RULE>

```lua
local CollectionService = game:GetService("CollectionService")
local tagged = CollectionService:GetTagged("Assistant:<GUID>")
if #tagged > 0 then
    local asset = tagged[1]
    local removed = 0
    for _, desc in asset:GetDescendants() do
        if desc:IsA("BaseScript") then
            desc:Destroy()
            removed += 1
        end
    end
    return "Sanitized " .. asset.Name .. ": removed " .. removed .. " scripts"
end
```

**Always run this. No exceptions.** If the model needs scripts to function (fire particles, animated parts), rebuild that behavior yourself after sanitizing.

### Step 4: Reference the Inserted Model

After sanitization, use the returned GUID tag to find the model in the scene:

```lua
local CollectionService = game:GetService("CollectionService")
local tagged = CollectionService:GetTagged("Assistant:<GUID>")
if #tagged > 0 then
    local asset = tagged[1]
    return asset.Name .. " (" .. asset.ClassName .. ") at " .. tostring(asset:GetPivot().Position)
end
return "Model not found by tag"
```

### Step 4: Position It

Based on the user's request, position the asset sensibly:
- "near platform 3" → find Platform_3's position, offset slightly
- "on the road" → find the Road part, place on its surface
- "at spawn" → use SpawnLocation position
- No specific location → place near camera or at origin

Use `execute_luau` to find reference positions:
```lua
local target = workspace:FindFirstChild("TARGET_NAME")
return tostring(target.Position)
```

Then pivot the inserted asset:
```lua
local asset = workspace:FindFirstChild("ASSET_NAME")
asset:PivotTo(CFrame.new(X, Y, Z))
return "Positioned at " .. tostring(asset:GetPivot().Position)
```

### Step 5: Verify Placement (REQUIRED)

Every placed object goes through a two-layer verification loop:

**Layer 1 — Logic check (code, instant):**

After placing, immediately run these checks via `execute_luau`:

```lua
-- Quick placement sanity check for a single object
local obj = workspace:FindFirstChild("OBJECT_NAME") -- or find in room folder
local room = workspace:FindFirstChild("ROOM_FOLDER")

local out = {}
local issues = 0

-- 1. Get object bounding box
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

-- 2. Check if bottom is on the floor (Y ~ 0-1)
local floorGap = min.Y
if floorGap > 2 then
    issues += 1
    table.insert(out, "FLOATING: bottom at Y=" .. string.format("%.1f", min.Y))
elseif floorGap < -0.5 then
    issues += 1
    table.insert(out, "BURIED: sunk into floor by " .. string.format("%.1f", -floorGap) .. " studs")
end

-- 3. Check against all walls in the room
if room then
    for _, child in room:GetChildren() do
        if child.Name:lower():match("wall") then
            local wMin = child.Position - child.Size/2
            local wMax = child.Position + child.Size/2
            local overlap = min.X < wMax.X and max.X > wMin.X and min.Y < wMax.Y and max.Y > wMin.Y and min.Z < wMax.Z and max.Z > wMin.Z
            if overlap then
                issues += 1
                table.insert(out, "CLIPPING through " .. child.Name)
            end
        end
    end
end

-- 4. Check rotation
if obj:IsA("BasePart") then
    local yRot = obj.Orientation.Y % 360
    local nearest = math.floor(yRot / 90 + 0.5) * 90
    if math.abs(yRot - nearest) > 5 and math.abs(yRot - nearest) < 85 then
        table.insert(out, "ODD ROTATION: Y=" .. string.format("%.0f", yRot) .. " degrees")
    end
end

table.insert(out, "Issues: " .. issues)
return table.concat(out, "\n")
```

**Fix any logic issues before proceeding.** Common fixes:
- Clipping → move 2-3 studs away from wall
- Floating → lower Y to sit on floor (or on the object it should rest on)
- Buried → raise Y
- Odd rotation → snap to nearest 90 degrees

**Layer 2 — Visual check (screenshot, catches what math can't):**

After logic issues are fixed, use `luau/smart-camera.luau` to focus on the placed object:

```lua
TARGET = "OBJECT_NAME"
-- [contents of luau/smart-camera.luau]
```

Then use the `screen_capture` MCP tool to capture a screenshot and analyze it. Look for:
- **Sub-objects misaligned** — books hanging off shelves, drawers poking through, legs not touching ground
- **Scale mismatch** — object way too big or small for the space
- **Orientation wrong** — object facing a wall instead of into the room
- **Floating mesh parts** — Creator Store models sometimes have parts that don't align with their collision box
- **Material/color clash** — object doesn't fit the scene's palette

**If visual issues found:** fix via `execute_luau` (reposition sub-parts, rotate, scale), then screenshot again. **Max 2 visual fix iterations per object** — after that, either accept it or swap for a different asset.

### Step 6: Report

After verification, briefly report to the user:
> "Placed [object] at [location]. Logic check clean. Looks good from [angle]."

Or if there were issues:
> "Placed [object] — had to fix wall clipping and rotate 90 degrees. Take a look."

## Search Tips

- **Be specific.** "wooden dining chair" returns better results than "chair"
- **Try variations.** If "couch" returns nothing good, try "sofa" or "living room couch"
- **Free models vary wildly in quality.** If the first result is bad, use the alternative asset IDs returned by the tool
- **Scale matters.** Some Creator Store models are huge, some are tiny. After inserting, check scale relative to surroundings and use `model:ScaleTo(factor)` if needed

## Creator Store is the Default, Primitives are the Fallback

<HARD-RULE>
ALWAYS search the Creator Store first. Creator Store models are higher quality, textured, and more visually detailed than anything you can build from primitives. The `insert_from_creator_store` MCP tool makes this a single call — search and insert in one step.
</HARD-RULE>

**Fallback chain:**
1. **Creator Store** (`insert_from_creator_store`) — first choice, always
2. **AI Mesh Generation** (`generate_mesh` MCP tool) — if Creator Store has nothing suitable, generate a custom textured mesh from a text prompt. Good for unique objects.
3. **Schema-Based Generation** (`execute_luau` with `GenerationService:GenerateModelAsync`) — for vehicles specifically, use the Car5 schema to generate a drivable car with separate body + 4 wheels:
   ```lua
   local GenService = game:GetService("GenerationService")
   local inputs = {TextPrompt = "a red sports car with 4 wheels"}
   local schema = {PredefinedSchema = "Car5"}
   local ok, model, meta = pcall(function()
       return GenService:GenerateModelAsync(inputs, schema)
   end)
   if ok then
       model:ScaleTo(16)
       model.Parent = workspace
       return "Generated Car5: " .. model.Name
   end
   ```
   Available schemas: `"Car5"` (body + 4 wheels, drivable), `"Body1"` (single mesh). More schemas coming.
4. **Primitives** — last resort. Native Parts with materials.

**When you fall back, document why:** "Searched Creator Store for [term], [reason], tried generate_mesh, [reason], built from primitives."

## If Insert Fails

Rare with `insert_from_creator_store`, but if it happens:

1. **Try the alternative asset IDs** returned by the tool.
2. **Try a different search term.** More specific terms get better results: "medieval wooden barrel" not "barrel".
3. **Use the `tag` parameter** to clone a previously-inserted model if you need duplicates.
4. **Last resort: build from primitives.** Native Parts with materials (Wood, Concrete, Fabric, Metal) are always reliable.

## Key Principles

- **Always check play mode** before inserting
- **Search before you guess** — don't make up asset IDs
- **One MCP call to search + insert** — use `insert_from_creator_store`
- **Reference by GUID tag** — use `CollectionService:GetTagged("Assistant:<GUID>")` to find inserted models
- **Fallback to primitives** — native Parts are always reliable
- **Position relative to context** — don't just drop things at the origin
- **The user's description guides the search** — translate intent into good search terms
