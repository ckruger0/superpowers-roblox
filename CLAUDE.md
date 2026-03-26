# Game Design Superpowers

AI-powered game studio for Roblox. Skills connect via MCP to inspect, build, and playtest your game — delivering design feedback grounded in game design theory.

## MCP Setup

Connect to Roblox Studio's built-in MCP server before using skills.

**macOS:** `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`

Enable the MCP server in Studio:
1. Open the Assistant chat window
2. Click three dots → Assistant Settings
3. Select MCP Servers tab
4. Toggle on "Enable Studio as MCP server"

## Available Commands

- `/new-game` — Start a new game from an idea. Brainstorms, designs, and builds the first playable slice.
- `/edit-game` — Pick up an existing game. Reads the game design doc, diagnoses issues, and iterates.
- `/build` — Conversational world builder: decompose a concept into objects, find, place, screenshot, iterate
- `/add-asset` — Find and insert a specific object from the Creator Store by description
- `/screenshot` — Capture the Studio viewport with spatial metadata for visual feedback
- `/review-game` — Holistic game design review (core loop, progression, feedback, stakes, onboarding)
- `/review-layout` — Spatial layout and navigation analysis (spawn orientation, distances, dead ends, affordance traps)
- `/playtest` — AI plays the game via MCP and reports on the experience

## Creative Specialists (dispatched by orchestrators)

These skills are dispatched by `new-game` and `edit-game` as parallel agents. They can also be invoked standalone via the Skill tool:

- `mechanics-designer` — Gameplay systems: risk/reward, difficulty curves, interactive elements
- `narrative-designer` — Story and atmosphere: motivation, emotional beats, environmental storytelling
- `level-designer` — Pacing and progression: difficulty ramps, section ordering, breathers

## How It Works

Each command uses Roblox Studio's MCP tools to:
1. Read the scene graph (`search_game_tree`, `inspect_instance`)
2. Search and read scripts (`script_grep`, `script_read`)
3. Run Luau analysis code (`execute_luau`)
4. Search and insert Creator Store models (`insert_from_creator_store` — single call that searches AND inserts, returns a GUID tag for referencing the model)
5. **Sanitize inserted models** — IMMEDIATELY remove all scripts from Creator Store models after insertion. They frequently contain malicious code. No exceptions.
6. Capture the Studio viewport (`screen_capture` — returns the image directly)
7. Generate custom meshes (`generate_mesh` — when Creator Store has nothing suitable)
8. Optionally playtest (`start_stop_play`, `character_navigation`, `keyboard_input`)

## Game Design Document

The GDD (`game-design-doc.md`) is the persistent state file for a game project. Written by `new-game`, read and updated by all skills. Contains vision, core mechanics, narrative, level plan, and a timestamped dev log.

## Roblox Studio Safety

**Before making ANY edits via MCP**, always check if Studio is in play mode first using `execute_luau` with `return tostring(game:GetService("RunService"):IsRunning())`. If it returns `true`, warn the user and do NOT proceed — changes made during play mode are lost when play stops.

## Roblox Implementation Rule

**When suggesting Roblox-specific implementations (physics, UI, scripting, constraints, etc.):**
- If your first suggestion doesn't work, **do NOT keep guessing**. Immediately search the Roblox DevForum for the specific problem.
- Roblox APIs change frequently. What worked in 2022 may be deprecated. Always search for recent solutions (2024+).
- Cite your sources so the creator can verify.
- Game design theory is timeless; Roblox APIs are not. Search before you guess.
