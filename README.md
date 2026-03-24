# Superpowers: Roblox

AI-powered game design skills for Roblox Studio, inspired by [Superpowers](https://github.com/obra/superpowers). Connect via MCP to get design-level feedback on your games, build scenes conversationally, and capture visual snapshots — all from Claude Code or any MCP-compatible AI client.

## What This Is

A set of composable AI skills that turn Claude into a game design consultant for Roblox. Instead of generating code or assets, these skills evaluate whether your experience is **fun, engaging, and well-designed** — grounded in game design theory (Theory of Fun, Art of Game Design, Flow theory).

The skills also include world-building tools that search the Creator Store, place objects, verify placement visually, and iterate until the scene looks right.

## Available Commands

| Command | What it does |
|---------|-------------|
| `/game-design-audit` | Conversational game design review — asks about your intent before evaluating core loop, progression, feedback, stakes, onboarding |
| `/spatial-flow` | Analyzes level layout, spawn orientation, sightlines, dead ends, affordance traps |
| `/playtest-audit` | AI plays your game via MCP and reports on the first-time player experience |
| `/visual-check` | Captures a screenshot of the Studio viewport with spatial metadata for visual feedback |
| `/add-asset` | Finds and inserts a Creator Store model by description, with placement verification |
| `/build-scene` | Conversational world builder — decomposes a concept into objects, places them, screenshots, iterates |

## Setup

### 1. Connect Roblox Studio MCP

Enable the built-in MCP server in Roblox Studio:
1. Open the Assistant chat window
2. Click three dots → Assistant Settings
3. Select MCP Servers tab
4. Toggle on "Enable Studio as MCP server"

### 2. Configure Claude Code

Add the MCP server to your Claude Code config:

**macOS:**
```json
{
  "mcpServers": {
    "Roblox_Studio": {
      "command": "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP"
    }
  }
}
```

### 3. Use the Skills

Open Claude Code in this repo directory, open Roblox Studio with your game, and run any command:

```
/game-design-audit
```

The AI will inspect your game via MCP and start a conversation about your design.

## How It Works

The skills use Roblox Studio's MCP tools to:
1. **Read the scene graph** — `search_game_tree`, `inspect_instance`
2. **Search and read scripts** — `script_grep`, `script_read`
3. **Run Luau analysis** — `execute_luau` with helper scripts in `luau/`
4. **Insert Creator Store models** — `insert_from_creator_store` (search + insert in one call)
5. **Capture the viewport** — `screen_capture` returns the image directly
6. **Generate meshes** — `generate_mesh` for custom objects
7. **Playtest** — `start_stop_play`, `character_navigation`, `keyboard_input`

## Key Design Principles

- **Ask before you judge** — skills understand the creator's intent before giving feedback
- **One question at a time** — conversational, not overwhelming
- **Creator's vision is primary** — a deliberately unfair obby is a valid design choice
- **Evidence over opinion** — feedback cites specific objects, distances, and scripts
- **Search before you guess** — if a Roblox implementation fails, search the DevForum before iterating
- **Creator Store first, primitives last** — always try real models before building from blocks
- **Sanitize Creator Store models** — strip all scripts from inserted models (malware is common)

## Project Structure

```
.claude/commands/     # Slash command entry points (thin pointers to skills)
skills/               # Full skill definitions (SKILL.md + supporting files)
  game-design-audit/  # Conversational game design review
  spatial-flow/       # Level layout analysis
  playtest-audit/     # AI playtests the game
  visual-check/       # Screenshot capture + analysis
  add-asset/          # Creator Store search + insert
  build-scene/        # Conversational world builder
luau/                 # Luau helper scripts for spatial analysis
test-games/           # Test game build instructions
```

## Security Note

Creator Store free models frequently contain malicious scripts (backdoors, obfuscated loaders, crypto miners). All skills enforce **mandatory script sanitization** — every inserted model has all `BaseScript` descendants destroyed immediately after insertion, before any other operations.

## Inspired By

This project is inspired by [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent ([@obra](https://github.com/obra)) — a composable skills framework for AI coding agents. Superpowers provides the architecture pattern of structured, conversational AI skills with hard gates, process flows, and iterative verification. This project adapts that pattern for game design in Roblox Studio.

## Built With

- [Superpowers](https://github.com/obra/superpowers) — skill architecture and philosophy
- [Roblox Studio MCP](https://create.roblox.com/docs/studio/mcp) — the bridge between AI and Studio
- [Claude Code](https://claude.ai/claude-code) — AI client
