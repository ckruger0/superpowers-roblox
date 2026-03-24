-- smart-camera.luau
-- Focuses the Studio camera on a target object reliably.
-- Uses bounding box calculation + Camera.Focus (the key to matching Studio's F-key behavior).
--
-- Set TARGET to the instance name before executing:
--   TARGET = "Couch"
--   [paste this script]

local targetName = TARGET or "SpawnLocation"
local cam = workspace.CurrentCamera

-- Find the target (recursive search through workspace and all children)
local function findRecursive(parent, name)
    for _, child in parent:GetChildren() do
        if child.Name == name then return child end
        local found = findRecursive(child, name)
        if found then return found end
    end
    return nil
end

local target = findRecursive(workspace, targetName)
if not target then return "Target '" .. targetName .. "' not found" end

-- Compute bounding box
local min = Vector3.new(math.huge, math.huge, math.huge)
local max = Vector3.new(-math.huge, -math.huge, -math.huge)
local partCount = 0

local function addPart(part)
    local pos = part.Position
    local half = part.Size / 2
    min = Vector3.new(math.min(min.X, pos.X-half.X), math.min(min.Y, pos.Y-half.Y), math.min(min.Z, pos.Z-half.Z))
    max = Vector3.new(math.max(max.X, pos.X+half.X), math.max(max.Y, pos.Y+half.Y), math.max(max.Z, pos.Z+half.Z))
    partCount += 1
end

if target:IsA("BasePart") then
    addPart(target)
elseif target:IsA("Model") then
    for _, desc in target:GetDescendants() do
        if desc:IsA("BasePart") then addPart(desc) end
    end
end

if partCount == 0 then return "Target has no BaseParts" end

local center = (min + max) / 2
local size = max - min
local radius = size.Magnitude / 2

-- Distance: pull back enough to see the whole object + breathing room
local fov = math.rad(cam.FieldOfView)
local distance = (radius / math.tan(fov / 2)) * 1.5
distance = math.clamp(distance, 8, 200)

-- Position camera slightly above and in front of the object
local camPos = center + Vector3.new(0, radius * 0.5, distance)

-- Set both CFrame AND Focus — Focus is what makes it orbit correctly (like pressing F)
cam.CFrame = CFrame.lookAt(camPos, center)
cam.Focus = CFrame.new(center)

-- Return metadata
local out = {}
table.insert(out, "Target: " .. targetName)
table.insert(out, "Center: " .. tostring(center))
table.insert(out, "Size: " .. tostring(size))
table.insert(out, "Radius: " .. string.format("%.1f", radius))
table.insert(out, "Camera distance: " .. string.format("%.0f", distance))
table.insert(out, "Camera pos: " .. tostring(cam.CFrame.Position))
table.insert(out, "Parts: " .. partCount)

return table.concat(out, "\n")
