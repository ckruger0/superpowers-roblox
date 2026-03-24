-- spatial-analysis.luau
-- Analyzes spawn position, orientation, and distances to key objects
-- Output: returned as a string (execute_luau captures return values, not print)

local out = {}
local function log(s) table.insert(out, s) end

local spawn = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
if not spawn then
    return "WARNING: No SpawnLocation found in workspace"
end

log("=== SPAWN ANALYSIS ===")
log("Spawn position: " .. tostring(spawn.Position))
log("Spawn orientation: " .. tostring(spawn.Orientation))

-- Determine what direction spawn faces (Y rotation)
local yRot = spawn.Orientation.Y
local facing = "unknown"
if yRot >= -45 and yRot < 45 then facing = "+Z (north)"
elseif yRot >= 45 and yRot < 135 then facing = "-X (west)"
elseif yRot >= -135 and yRot < -45 then facing = "+X (east)"
else facing = "-Z (south)" end
log("Spawn faces: " .. facing .. " (Y rotation: " .. yRot .. " degrees)")

-- Count key instance types
local partCount = 0
local modelCount = 0
local scriptCount = 0
local uiCount = 0
for _, desc in workspace:GetDescendants() do
    if desc:IsA("BasePart") then partCount += 1 end
    if desc:IsA("Model") then modelCount += 1 end
    if desc:IsA("BaseScript") then scriptCount += 1 end
    if desc:IsA("ScreenGui") or desc:IsA("BillboardGui") then uiCount += 1 end
end
log("")
log("=== SCENE SUMMARY ===")
log("BaseParts: " .. partCount)
log("Models: " .. modelCount)
log("Scripts: " .. scriptCount)
log("UI elements: " .. uiCount)

-- Find named models and their distances from spawn
log("")
log("=== NAMED MODELS BY DISTANCE ===")
local models = {}
for _, desc in workspace:GetDescendants() do
    if desc:IsA("Model") and desc.Name ~= "Camera" then
        local part = desc.PrimaryPart or desc:FindFirstChildWhichIsA("BasePart")
        if part then
            local dist = (part.Position - spawn.Position).Magnitude
            table.insert(models, {name = desc.Name, distance = math.floor(dist), pos = tostring(part.Position)})
        end
    end
end
table.sort(models, function(a, b) return a.distance < b.distance end)
for i, m in models do
    if i <= 20 then
        log(string.format("  %d. %s — %d studs (at %s)", i, m.name, m.distance, m.pos))
    end
end

return table.concat(out, "\n")
