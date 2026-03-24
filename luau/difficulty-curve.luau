-- difficulty-curve.luau
-- Measures distances between adjacent platforms to assess difficulty curve
-- Finds all BaseParts that could be platforms (roughly horizontal, > 3 studs wide)
-- Output: returned as a string (execute_luau captures return values, not print)

local out = {}
local function log(s) table.insert(out, s) end

local spawn = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
local spawnPos = spawn and spawn.Position or Vector3.new(0, 0, 0)

log("=== PLATFORM ANALYSIS ===")
local platforms = {}
for _, desc in workspace:GetDescendants() do
    if desc:IsA("BasePart") and not desc:IsA("Terrain") then
        local size = desc.Size
        -- Consider it a platform if it's wider/deeper than tall (roughly horizontal)
        if (size.X >= 3 or size.Z >= 3) and size.Y <= size.X and size.Y <= size.Z then
            local dist = (desc.Position - spawnPos).Magnitude
            table.insert(platforms, {
                name = desc.Name,
                pos = desc.Position,
                size = size,
                distFromSpawn = dist
            })
        end
    end
end

-- Sort by distance from spawn (approximation of play order)
table.sort(platforms, function(a, b) return a.distFromSpawn < b.distFromSpawn end)

log("Found " .. #platforms .. " potential platforms")

if #platforms < 2 then
    return "Not enough platforms to analyze difficulty curve"
end

log("")
log("=== GAP ANALYSIS (sequential by distance from spawn) ===")
local gaps = {}
for i = 2, math.min(#platforms, 20) do
    local prev = platforms[i - 1]
    local curr = platforms[i]
    local gap = (curr.pos - prev.pos).Magnitude
    local heightDiff = curr.pos.Y - prev.pos.Y
    table.insert(gaps, {
        from = prev.name,
        to = curr.name,
        gap = math.floor(gap * 10) / 10,
        heightDiff = math.floor(heightDiff * 10) / 10,
        index = i - 1
    })
    log(string.format("  Jump %d: %s → %s — gap: %.1f studs, height diff: %.1f studs",
        i - 1, prev.name, curr.name, gap, heightDiff))
end

-- Analyze difficulty trend
log("")
log("=== DIFFICULTY ASSESSMENT ===")
if #gaps >= 2 then
    local firstGap = gaps[1].gap
    local increasing = true
    local decreasing = true
    local prevGap = firstGap
    for i = 2, #gaps do
        if gaps[i].gap < prevGap - 1 then increasing = false end
        if gaps[i].gap > prevGap + 1 then decreasing = false end
        prevGap = gaps[i].gap
    end
    if increasing then
        log("  Difficulty INCREASES over time (good — matches expected learning curve)")
    elseif decreasing then
        log("  WARNING: Difficulty DECREASES over time (inverted curve — early players will churn)")
    else
        log("  Difficulty is INCONSISTENT (no clear curve — consider smoothing the progression)")
    end

    local maxGap = 0
    local maxGapIndex = 1
    for i, g in gaps do
        if g.gap > maxGap then maxGap = g.gap; maxGapIndex = i end
    end
    log(string.format("  Hardest jump: #%d (%s → %s) at %.1f studs", maxGapIndex, gaps[maxGapIndex].from, gaps[maxGapIndex].to, maxGap))
    if maxGapIndex <= 2 then
        log("  WARNING: Hardest jump is near the START — this will frustrate new players immediately")
    end
end

return table.concat(out, "\n")
