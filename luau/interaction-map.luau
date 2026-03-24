-- interaction-map.luau
-- Finds all interactive objects (ClickDetector, ProximityPrompt, TouchTransmitter)
-- Detects affordance traps: objects that LOOK interactive but have no script
-- Output: returned as a string (execute_luau captures return values, not print)

local out = {}
local function log(s) table.insert(out, s) end

local spawn = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
local spawnPos = spawn and spawn.Position or Vector3.new(0, 0, 0)

log("=== INTERACTIVE OBJECTS ===")
local interactive = {}
for _, desc in workspace:GetDescendants() do
    if desc:IsA("ClickDetector") or desc:IsA("ProximityPrompt") or desc:IsA("TouchTransmitter") then
        local parent = desc.Parent
        local pos = nil
        if parent:IsA("BasePart") then
            pos = parent.Position
        elseif parent:IsA("Model") then
            local part = parent.PrimaryPart or parent:FindFirstChildWhichIsA("BasePart")
            if part then pos = part.Position end
        end
        if pos then
            local dist = (pos - spawnPos).Magnitude
            table.insert(interactive, {
                name = parent.Name,
                distance = math.floor(dist),
                type = desc.ClassName,
                pos = tostring(pos)
            })
        end
    end
end

table.sort(interactive, function(a, b) return a.distance < b.distance end)

if #interactive == 0 then
    log("  No interactive objects found (no ClickDetector, ProximityPrompt, or TouchTransmitter)")
else
    for i, obj in interactive do
        log(string.format("  %d. %s (%s) — %d studs from spawn (at %s)", i, obj.name, obj.type, obj.distance, obj.pos))
    end
end

log("")
log("=== AFFORDANCE TRAPS ===")
log("(Objects that look interactive by name but have no script)")
local trapCount = 0
local suspiciousNames = {"door", "button", "lever", "chest", "switch", "gate", "handle", "key", "lock", "trigger", "portal"}
for _, desc in workspace:GetDescendants() do
    if desc:IsA("Model") or desc:IsA("BasePart") then
        local nameLower = desc.Name:lower()
        local looksInteractive = false
        for _, keyword in suspiciousNames do
            if nameLower:match(keyword) then
                looksInteractive = true
                break
            end
        end
        if looksInteractive then
            local hasScript = false
            local hasInteractor = false
            if desc:IsA("Model") then
                hasScript = desc:FindFirstChildWhichIsA("BaseScript", true) ~= nil
                hasInteractor = desc:FindFirstChildWhichIsA("ClickDetector", true) ~= nil
                    or desc:FindFirstChildWhichIsA("ProximityPrompt", true) ~= nil
            elseif desc:IsA("BasePart") then
                hasScript = desc:FindFirstChildWhichIsA("BaseScript") ~= nil
                hasInteractor = desc:FindFirstChild("ClickDetector") ~= nil
                    or desc:FindFirstChild("ProximityPrompt") ~= nil
            end
            if not hasScript and not hasInteractor then
                trapCount += 1
                log(string.format("  TRAP: '%s' — name suggests interactivity but has no script or detector", desc.Name))
            end
        end
    end
end
if trapCount == 0 then
    log("  No affordance traps detected")
end

return table.concat(out, "\n")
