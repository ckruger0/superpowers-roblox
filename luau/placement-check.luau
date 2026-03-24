-- placement-check.luau
-- Checks all placed objects for common placement issues:
-- 1. Floating above the floor (not grounded)
-- 2. Clipping through walls (bounding box extends past room boundaries)
-- 3. Clipping through other objects (bounding box overlaps)
-- 4. Weird rotation (not aligned to room axes — 0/90/180/270)
-- 5. Scale mismatch (way bigger or smaller than neighbors)
--
-- Set ROOM_FOLDER to the folder name containing the room, or nil for all of workspace

local ROOM_FOLDER = ROOM_FOLDER or nil

local out = {}
local function log(s) table.insert(out, s) end
local issues = 0

-- Find the room container
local container = ROOM_FOLDER and workspace:FindFirstChild(ROOM_FOLDER) or workspace

-- Gather all placed objects with their bounding boxes
local objects = {}
local wallParts = {}
local floorY = math.huge

for _, child in container:GetChildren() do
    if child:IsA("BasePart") or child:IsA("Model") then
        local parts = {}
        if child:IsA("BasePart") then
            table.insert(parts, child)
        elseif child:IsA("Model") then
            for _, d in child:GetDescendants() do
                if d:IsA("BasePart") then table.insert(parts, d) end
            end
        end

        if #parts > 0 then
            -- Compute bounding box
            local min = Vector3.new(math.huge, math.huge, math.huge)
            local max = Vector3.new(-math.huge, -math.huge, -math.huge)

            for _, part in parts do
                local pos = part.Position
                local half = part.Size / 2
                min = Vector3.new(math.min(min.X, pos.X-half.X), math.min(min.Y, pos.Y-half.Y), math.min(min.Z, pos.Z-half.Z))
                max = Vector3.new(math.max(max.X, pos.X+half.X), math.max(max.Y, pos.Y+half.Y), math.max(max.Z, pos.Z+half.Z))
            end

            local entry = {
                name = child.Name,
                instance = child,
                min = min,
                max = max,
                center = (min + max) / 2,
                size = max - min,
                volume = (max.X-min.X) * (max.Y-min.Y) * (max.Z-min.Z),
                bottomY = min.Y,
            }

            -- Classify: is this a wall, floor, or furniture?
            local nameLower = child.Name:lower()
            if nameLower:match("wall") or nameLower:match("ceiling") then
                table.insert(wallParts, entry)
            elseif nameLower:match("floor") or child.ClassName == "Terrain" then
                floorY = math.min(floorY, max.Y)
            else
                table.insert(objects, entry)
            end
        end
    end
end

if floorY == math.huge then floorY = 0 end

log("=== PLACEMENT CHECK ===")
log("Floor surface Y: " .. string.format("%.1f", floorY))
log("Objects: " .. #objects .. ", Walls: " .. #wallParts)
log("")

-- CHECK 1: Floating objects (bottom of bounding box above floor with nothing underneath)
log("--- FLOATING CHECK ---")
for _, obj in objects do
    local gap = obj.bottomY - floorY
    if gap > 1.5 then
        -- Check if there's another object directly below supporting this one
        local supported = false
        for _, other in objects do
            if other.name ~= obj.name then
                -- Is 'other' below 'obj' and overlapping horizontally?
                local horizOverlap = obj.min.X < other.max.X and obj.max.X > other.min.X
                    and obj.min.Z < other.max.Z and obj.max.Z > other.min.Z
                local vertClose = math.abs(obj.bottomY - other.max.Y) < 2
                if horizOverlap and vertClose then
                    supported = true
                    break
                end
            end
        end
        -- Also check if supported by a wall (e.g. shelves attached to wall)
        if not supported then
            for _, wall in wallParts do
                local touching = obj.min.X < wall.max.X and obj.max.X > wall.min.X
                    and obj.min.Z < wall.max.Z and obj.max.Z > wall.min.Z
                    and obj.min.Y < wall.max.Y and obj.max.Y > wall.min.Y
                if touching then supported = true; break end
            end
        end
        if not supported then
            issues += 1
            log(string.format("  FLOATING: '%s' bottom is %.1f studs above floor with nothing supporting it", obj.name, gap))
        end
    end
end

-- CHECK 2: Clipping through walls
log("")
log("--- WALL CLIPPING CHECK ---")
for _, obj in objects do
    for _, wall in wallParts do
        -- Check if object bounding box overlaps wall bounding box
        local overlap = obj.min.X < wall.max.X and obj.max.X > wall.min.X
            and obj.min.Y < wall.max.Y and obj.max.Y > wall.min.Y
            and obj.min.Z < wall.max.Z and obj.max.Z > wall.min.Z

        if overlap then
            -- How much does it clip?
            local overlapX = math.min(obj.max.X, wall.max.X) - math.max(obj.min.X, wall.min.X)
            local overlapZ = math.min(obj.max.Z, wall.max.Z) - math.max(obj.min.Z, wall.min.Z)
            local clipAmount = math.min(overlapX, overlapZ)

            if clipAmount > 1 then
                issues += 1
                log(string.format("  CLIPPING: '%s' clips through '%s' by ~%.1f studs", obj.name, wall.name, clipAmount))
            end
        end
    end
end

-- CHECK 3: Object-to-object overlap
log("")
log("--- OBJECT OVERLAP CHECK ---")
local checked = {}
for i, a in objects do
    for j, b in objects do
        if i < j then
            local key = a.name .. "+" .. b.name
            if not checked[key] then
                checked[key] = true
                local overlap = a.min.X < b.max.X and a.max.X > b.min.X
                    and a.min.Y < b.max.Y and a.max.Y > b.min.Y
                    and a.min.Z < b.max.Z and a.max.Z > b.min.Z

                if overlap then
                    -- Ignore small overlaps (touching is fine)
                    local overlapVol = math.max(0, math.min(a.max.X,b.max.X) - math.max(a.min.X,b.min.X))
                        * math.max(0, math.min(a.max.Y,b.max.Y) - math.max(a.min.Y,b.min.Y))
                        * math.max(0, math.min(a.max.Z,b.max.Z) - math.max(a.min.Z,b.min.Z))
                    local smallerVol = math.min(a.volume, b.volume)

                    if smallerVol > 0 and overlapVol / smallerVol > 0.2 then
                        issues += 1
                        log(string.format("  OVERLAP: '%s' and '%s' overlap significantly (%.0f%% of smaller object)",
                            a.name, b.name, (overlapVol/smallerVol)*100))
                    end
                end
            end
        end
    end
end

-- CHECK 4: Rotation alignment
log("")
log("--- ROTATION CHECK ---")
for _, child in container:GetChildren() do
    if child:IsA("BasePart") and not child.Name:lower():match("floor")
        and not child.Name:lower():match("terrain") then
        local ori = child.Orientation
        local yRot = ori.Y % 360
        -- Check if Y rotation is near 0, 90, 180, or 270
        local nearestCardinal = math.floor(yRot / 90 + 0.5) * 90
        local deviation = math.abs(yRot - nearestCardinal)
        if deviation > 5 and deviation < 85 then
            -- Allow intentionally weird rotations (check name)
            if not child.Name:match("Tilt") and not child.Name:match("Sideways")
                and not child.Name:match("Float") and not child.Name:match("Giant") then
                issues += 1
                log(string.format("  ODD ROTATION: '%s' Y rotation is %.0f° (not aligned to room)", child.Name, yRot))
            end
        end
    end
end

-- CHECK 5: Scale outliers
log("")
log("--- SCALE CHECK ---")
local volumes = {}
for _, obj in objects do
    if obj.volume > 0.1 then
        table.insert(volumes, {name = obj.name, vol = obj.volume, size = obj.size})
    end
end
if #volumes > 2 then
    -- Find median volume
    table.sort(volumes, function(a, b) return a.vol < b.vol end)
    local median = volumes[math.ceil(#volumes/2)].vol

    for _, v in volumes do
        if v.vol > median * 50 then
            issues += 1
            log(string.format("  TOO BIG: '%s' is %.0fx larger than median object (size: %s)", v.name, v.vol/median, tostring(v.size)))
        elseif v.vol < median / 50 and v.vol > 0.5 then
            issues += 1
            log(string.format("  TOO SMALL: '%s' is %.0fx smaller than median (size: %s)", v.name, median/v.vol, tostring(v.size)))
        end
    end
end

log("")
log(string.format("=== TOTAL ISSUES: %d ===", issues))

return table.concat(out, "\n")
