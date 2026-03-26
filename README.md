# Superpowers: Roblox

An AI game studio for Roblox. Tell it what you want to make, and it helps you design, build, and playtest your game — all from Claude Code.

Built for young creators who have a vision but don't know where to start. Powered by [Superpowers](https://github.com/obra/superpowers) and Roblox Studio's MCP server.

## Quick Start

### Install the Plugin

```
/plugin marketplace add ckruger0/superpowers-roblox
/plugin install superpowers-roblox
```

### Connect Roblox Studio

1. Open the Assistant chat window in Roblox Studio
2. Click three dots → Assistant Settings
3. Select MCP Servers tab
4. Toggle on "Enable Studio as MCP server"

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

### Make a Game

```
/new-game
```

Tell it your idea. It takes care of the rest.

## Your AI Game Studio

Every skill maps to a role on a game development team:

| Command | Role | What they do |
|---------|------|-------------|
| `/new-game` | **Creative Director** | Takes your idea from concept to playable game |
| `/edit-game` | **Creative Director** | Picks up where you left off — fixes, improves, adds more |
| `/build` | **World Builder** | Places and arranges 3D objects from the Creator Store |
| `/add-asset` | **Prop Artist** | Finds and inserts a single object |
| `/screenshot` | **Cinematographer** | Captures what the game looks like |
| `/review-game` | **Design Reviewer** | Checks if your game is fun and well-designed |
| `/review-layout` | **Level Reviewer** | Checks if players can navigate your space |
| `/playtest` | **QA Tester** | Plays your game and reports what happened |

Behind the scenes, the Creative Director also dispatches **creative specialists** — a Mechanics Engineer, Story Architect, and Level Flow Planner — who brainstorm ideas in parallel and bring them back for you to choose from.

## How It Works

The skills use Roblox Studio's MCP server to read your game, place objects, capture screenshots, and playtest — all without leaving Claude Code. A **game design document** (`game-design-doc.md`) keeps track of your vision, mechanics, story, and what's been built so far.

## Key Principles

- **Speed to magic moment** — You're playing a rough version of your game within minutes
- **Paintbrush, not autopilot** — You make the creative decisions, the AI does the heavy lifting
- **Your vision is primary** — The AI helps you achieve YOUR goals, not generic "best practices"
- **Build, play, iterate** — Make something, try it, improve it. That's how real games are made.

## Security

Creator Store free models frequently contain malicious scripts. All skills enforce **mandatory script sanitization** — every inserted model has all scripts removed immediately after insertion.

## Credits

- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent — skill architecture and philosophy
- [Roblox Studio MCP](https://create.roblox.com/docs/studio/mcp) — the bridge between AI and Studio
- [Claude Code](https://claude.ai/claude-code) — AI client
