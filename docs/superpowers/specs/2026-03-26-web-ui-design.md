# Game Studio Web UI — Design Spec

## Vision

A local web application (Next.js on localhost) that replaces the Claude Code CLI as the primary interface for the Roblox game design skill suite. Built for young creators (8-17) who want a visual, spatial workspace for designing games — not a terminal.

The UI is an **infinite canvas** (FigJam-style) where kids drag in inspiration, brainstorm with an AI creative director, and watch their game get built in Roblox Studio — all in one workspace.

### Core UX Principle: Three-Stage Progression

The UI evolves as the game design solidifies:

**Stage 1 — Messy Canvas ("I have an idea"):** Kid drags in images, sticky notes, text. The AI chat bubble appears and starts asking questions. Pure creative chaos.

**Stage 2 — Brainstorming ("The team has ideas"):** AI creative specialists propose ideas in the chat. Kid picks favorites. A GDD panel slides up from the bottom as a bento-box of locked decisions — each solidified decision gets its own card (Vision, Mechanics, Story, Levels).

**Stage 3 — Building ("Let's make it real"):** GDD is locked. Canvas becomes a build tracker showing rooms with live screenshots flowing in from Roblox Studio. AI chat shows build progress and asks creative questions at decision points.

### Design Constraints

- **Speed to magic moment** — kid is playing a rough version of their game within minutes
- **Paintbrush, not autopilot** — kid makes creative decisions, AI does heavy lifting
- **Creator Store assets for everything** — game should look polished, not blocky
- **Local-only** — runs on localhost alongside Roblox Studio, no cloud dependency
- **Roblox Studio MCP** — all game manipulation happens via MCP tools on the local machine

## Architecture

```
┌──────────────────────────────┐
│   Browser (localhost:3000)   │
│   Next.js App                │
│   - Infinite canvas (React)  │
│   - AI chat panel            │
│   - GDD bento box            │
│   - Screenshot gallery       │
│   - Moodboard drag-and-drop  │
└──────────┬───────────────────┘
           │ WebSocket + REST
┌──────────▼───────────────────┐
│   Next.js API Routes         │
│   - /api/chat (streaming)    │
│   - /api/mcp/* (MCP proxy)   │
│   - /api/project (GDD CRUD)  │
│   - /api/canvas (state save) │
└──────┬──────────┬────────────┘
       │          │
┌──────▼──┐  ┌───▼──────────────┐
│ Anthropic│  │ MCP Client       │
│ API      │  │ (stdio transport │
│ (Claude) │  │  to StudioMCP)   │
└──────────┘  └──────────────────┘
```

### Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Canvas:** React Flow or tldraw (infinite canvas library with drag-and-drop, zoom/pan)
- **AI:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with streaming
- **MCP Client:** `@modelcontextprotocol/sdk` TypeScript client (stdio transport to Roblox Studio MCP binary)
- **State:** Local filesystem (project directory) + React state. No database.
- **Styling:** Tailwind CSS + dark theme matching the mockups

### Why These Choices

- **tldraw** over React Flow: tldraw is purpose-built for freeform canvas (sticky notes, images, freehand drawing). React Flow is for node graphs. tldraw matches the FigJam vibe better.
- **Anthropic SDK directly** over Claude Code SDK: Full control over conversation flow, tool calling, and streaming. Skills become prompt templates injected as system messages.
- **MCP SDK stdio transport**: The Roblox Studio MCP server is a local binary (`StudioMCP`). The MCP SDK connects via stdio, same as Claude Code does.
- **No database**: Project state lives in the project directory as files (GDD, canvas state, screenshots). Simple, portable, git-friendly.

## Component Architecture

### 1. Infinite Canvas (`components/canvas/`)

The main workspace. Uses tldraw as the canvas engine.

**Canvas objects (custom tldraw shapes):**
- **StickyNote** — colored note with editable text. Kid types thoughts.
- **ImageCard** — dragged-in image (moodboard, reference). Supports drag-and-drop from filesystem.
- **ScreenshotCard** — screenshot from Roblox Studio. Auto-placed when screenshots come in. Shows room label and timestamp.
- **RoomCard** — represents a game room/section in the level plan. Color-coded by status (pending/building/done). Shows mini-screenshot when built.
- **TextBlock** — freeform text area for longer notes.

**Canvas behaviors:**
- Infinite pan/zoom (tldraw built-in)
- Drag-and-drop images from desktop onto canvas
- Right-click context menu: add sticky note, add text, add image
- Double-click empty space to add a sticky note
- Canvas state auto-saves to `.game-studio/canvas-state.json` in the project directory

### 2. AI Chat Panel (`components/chat/`)

Floating, collapsible panel anchored to bottom-right of the canvas.

**States:**
- **Collapsed** — small pill showing "Creative Director" + unread count
- **Expanded** — chat window with message history, input, and specialist status indicators

**Message types:**
- **AI message** — text from the Creative Director
- **Choice message** — clickable options (A/B/C) from specialist proposals. Kid clicks to choose.
- **Screenshot message** — inline screenshot from Roblox Studio with "Does this look right?" prompt
- **Status message** — "Mechanics Engineer brainstorming..." with animated indicator
- **Build progress** — checklist of what's being placed ("✓ Placed lava pool", "▶ Adding particles...")

**Streaming:** AI responses stream token-by-token via SSE from the backend. Feels responsive.

**Specialist indicators:** When creative specialists are dispatched in parallel, show colored dots with role names (Mechanics Engineer = red, Story Architect = green, Level Planner = blue). Dots pulse while working, go solid when results are in.

### 3. GDD Bento Box (`components/gdd/`)

Slides up from the bottom of the screen as decisions solidify. Expandable/collapsible.

**Layout:** Grid of bento-box cards, one per GDD section:
- **Vision** (red accent) — the game idea in the kid's words
- **Mechanics** (green accent) — core gameplay systems
- **Narrative** (yellow accent) — story, motivation, atmosphere
- **Level Plan** (blue accent) — section-by-section progression
- **Dev Log** (gray accent) — timestamped history (collapsed by default)

**Card states:**
- **Empty** — dashed border, "Waiting for input..." text
- **Drafting** — filled with current proposal, "drafting..." badge
- **Locked** — solid border, checkmark badge, content finalized

**Behavior:**
- Cards are read-only summaries. The AI fills them as decisions are made in the chat.
- Kid can click a card to expand it and see full details.
- "Edit" button on each card re-opens that topic in the chat ("Let's revisit the mechanics...")
- GDD state syncs to `game-design-doc.md` in the project directory (the same file the CLI skills use)

### 4. Build Tracker (Stage 3 canvas overlay)

When the GDD is locked and building begins, the canvas gains a build overlay:
- **Room cards** arranged in level order with arrows showing flow
- Each room card shows: name, difficulty, pacing role, status (pending/building/done)
- When a room is being built, it shows a spinner
- When done, the room card fills with the actual Roblox Studio screenshot
- Click a room card to see all screenshots from that room

### 5. Backend API (`app/api/`)

#### `/api/chat` (POST, streaming SSE)

Main AI conversation endpoint.

- Receives: user message + conversation history + GDD state + canvas context
- Loads the appropriate skill as a system prompt (new-game, edit-game, or specialist)
- Calls Anthropic API with tool use enabled
- MCP tools are defined as Claude tools — when Claude calls a tool, the backend executes it via the MCP client
- Streams response tokens back via SSE
- When a tool call completes (e.g., screenshot), sends a special SSE event with the result

**Skill loading:** Skills are loaded from the `skills/` directory as system prompt templates. The backend reads the SKILL.md, strips YAML frontmatter, and injects it as the system message. This means the same skill files work for both the web UI and CLI.

**Tool calling flow:**
1. Claude decides to call an MCP tool (e.g., `insert_from_creator_store`)
2. Backend intercepts the tool call
3. Backend executes via MCP client (stdio to StudioMCP)
4. Backend sends tool result back to Claude
5. Claude continues generating
6. If the tool was `screen_capture`, backend also sends the image to the frontend via a special SSE event

#### `/api/mcp/status` (GET)

Returns MCP connection status (connected/disconnected/error). Frontend shows connection indicator.

#### `/api/mcp/screenshot` (GET)

Directly captures a screenshot via MCP (for manual "take a screenshot" button on the UI).

#### `/api/project` (GET/PUT)

CRUD for the GDD file (`game-design-doc.md`). GET returns parsed GDD sections. PUT updates specific sections.

#### `/api/canvas` (GET/PUT)

Save/load canvas state to `.game-studio/canvas-state.json`.

### 6. MCP Client (`lib/mcp-client.ts`)

Manages the connection to Roblox Studio's MCP server.

- Uses `@modelcontextprotocol/sdk` with stdio transport
- Spawns the StudioMCP binary as a child process
- Exposes all MCP tools as typed functions
- Handles connection lifecycle (connect, reconnect, disconnect)
- Converts MCP tool results to Anthropic tool_result format for the AI conversation

**Available MCP tools (from Roblox Studio):**
- `search_game_tree` — query the scene graph
- `inspect_instance` — get details about a specific instance
- `script_grep` — search scripts
- `script_read` — read a script's source
- `execute_luau` — run Luau code in Studio
- `insert_from_creator_store` — search + insert Creator Store model
- `screen_capture` — capture viewport screenshot
- `generate_mesh` — AI mesh generation
- `start_stop_play` — toggle play mode
- `character_navigation` — move character to position
- `keyboard_input` / `mouse_input` — simulate input

### 7. Skill Loader (`lib/skill-loader.ts`)

Reads skill SKILL.md files and converts them to system prompts for the Anthropic API.

- Reads from the `skills/` directory (same files as CLI)
- Strips YAML frontmatter
- Injects GDD context (current game-design-doc.md contents) into the system prompt
- For orchestrator skills (new-game, edit-game): the backend handles specialist dispatch as separate Anthropic API conversations, then reconciles results before presenting to the kid
- For specialist skills: run as independent conversations scoped to their specialty

## File Structure

```
game-studio/                    # New directory alongside skills/
├── app/
│   ├── layout.tsx              # Root layout, dark theme, fonts
│   ├── page.tsx                # Main canvas page
│   └── api/
│       ├── chat/route.ts       # Streaming AI chat endpoint
│       ├── mcp/
│       │   ├── status/route.ts # MCP connection status
│       │   └── screenshot/route.ts
│       ├── project/route.ts    # GDD CRUD
│       └── canvas/route.ts     # Canvas state save/load
├── components/
│   ├── canvas/
│   │   ├── GameCanvas.tsx      # Main tldraw canvas wrapper
│   │   ├── shapes/             # Custom tldraw shapes
│   │   │   ├── StickyNote.tsx
│   │   │   ├── ImageCard.tsx
│   │   │   ├── ScreenshotCard.tsx
│   │   │   ├── RoomCard.tsx
│   │   │   └── TextBlock.tsx
│   │   └── CanvasToolbar.tsx   # Canvas tools (add note, add image, etc.)
│   ├── chat/
│   │   ├── ChatPanel.tsx       # Floating chat panel
│   │   ├── ChatMessage.tsx     # Individual message component
│   │   ├── ChoiceMessage.tsx   # Clickable A/B/C options
│   │   ├── ScreenshotMessage.tsx
│   │   ├── StatusIndicator.tsx # Specialist working indicators
│   │   └── ChatInput.tsx       # Input with send button
│   ├── gdd/
│   │   ├── GDDBentoBox.tsx     # Expandable bento box panel
│   │   ├── GDDCard.tsx         # Individual section card
│   │   └── GDDExpandedView.tsx # Full-screen expanded card
│   ├── build/
│   │   ├── BuildTracker.tsx    # Room progress overlay
│   │   └── RoomStatus.tsx      # Individual room status
│   └── shared/
│       ├── ConnectionStatus.tsx # MCP connection indicator
│       └── StageIndicator.tsx  # Stage 1/2/3 indicator
├── lib/
│   ├── mcp-client.ts           # MCP connection + tool execution
│   ├── skill-loader.ts         # Load skills as system prompts
│   ├── anthropic.ts            # Anthropic API client wrapper
│   ├── gdd.ts                  # GDD file parser/writer
│   ├── canvas-state.ts         # Canvas state persistence
│   └── types.ts                # Shared TypeScript types
├── public/
│   └── fonts/                  # Custom fonts if needed
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                  # ANTHROPIC_API_KEY, MCP_BINARY_PATH
```

## Data Flow

### New Game Flow

1. Kid opens `localhost:3000`, sees empty canvas
2. Kid drags in images, types sticky notes with ideas
3. Kid opens chat, types "I want to make a scary obby with lava"
4. Backend loads `skills/new-game/SKILL.md` as system prompt
5. Claude streams Phase 1 (CONNECT) questions
6. After 2-3 answers, backend dispatches 3 parallel conversations (one per creative specialist)
7. Frontend shows specialist status indicators (pulsing dots)
8. All 3 return → backend reconciles → streams unified options as ChoiceMessage
9. Kid clicks choices → backend runs dependency loop if needed
10. Claude approves → backend writes GDD → frontend shows bento box sliding up
11. Claude starts Phase 4 (BUILD) → MCP tool calls begin
12. Screenshots stream in as ScreenshotCards on the canvas
13. At decision points, Claude asks the kid in chat
14. After first slice, Claude suggests playtest → kid hits play in Roblox Studio

### Edit Game Flow

1. Kid opens the app with an existing project (GDD exists)
2. Backend loads GDD, shows bento box with current state
3. Canvas shows existing screenshots and room cards
4. Kid types "the middle part is boring"
5. Backend loads `skills/edit-game/SKILL.md`, injects GDD as context
6. Claude dispatches analysts (playtest, review-layout) via MCP
7. Results come back → Claude dispatches specialists for fix ideas
8. Kid picks fixes → build/screenshot cycle continues

### Specialist Dispatch (Backend Orchestration)

When the orchestrator skill (new-game/edit-game) needs to dispatch specialists:

1. Backend creates 3 separate Anthropic API conversations (one per specialist)
2. Each gets: the specialist's SKILL.md as system prompt + the kid's idea + GDD context
3. All 3 run in parallel (Promise.all)
4. Backend collects results
5. Backend feeds results back into the main orchestrator conversation
6. Orchestrator reconciles and produces a unified response for the kid

This replaces the Agent tool dispatch that Claude Code uses — same pattern, different mechanism.

## State Management

### Project Directory Structure

```
my-roblox-game/
├── game-design-doc.md          # GDD (same format as CLI skills use)
├── .game-studio/
│   ├── canvas-state.json       # tldraw canvas state
│   ├── screenshots/            # Screenshots from Roblox Studio
│   │   ├── room-1-spawn.png
│   │   ├── room-2-lava.png
│   │   └── ...
│   ├── uploads/                # Kid's uploaded images (moodboard)
│   │   ├── lava-reference.jpg
│   │   └── ...
│   └── conversations/          # Chat history per session
│       └── session-{timestamp}.json
├── *.rbxl                      # Roblox Studio file
└── ...
```

### What Lives Where

| Data | Storage | Why |
|------|---------|-----|
| GDD | `game-design-doc.md` | Shared with CLI skills, human-readable |
| Canvas layout | `.game-studio/canvas-state.json` | tldraw native format |
| Screenshots | `.game-studio/screenshots/` | Files on disk, referenced by canvas |
| Moodboard images | `.game-studio/uploads/` | Uploaded by kid |
| Chat history | `.game-studio/conversations/` | Per-session JSON |
| AI conversation state | In-memory (backend) | Ephemeral, rebuilt from chat history on restart |
| MCP connection | In-memory (backend) | Reconnects on restart |

## Environment Configuration

```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
MCP_BINARY_PATH=/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP
PROJECT_DIR=/path/to/my-roblox-game
```

## Scope for V1

**In scope:**
- Infinite canvas with sticky notes, image drag-and-drop, screenshot cards
- AI chat panel with streaming responses
- GDD bento box that crystallizes as decisions are made
- MCP connection to Roblox Studio
- Full new-game flow (connect → design → build → playtest)
- Skill loading from existing skill files
- Dark theme matching mockups

**Out of scope (future):**
- Edit-game flow (V2 — needs GDD loading + canvas restoration)
- Multi-room build tracker overlay (V2)
- Real-time collaboration / multiplayer canvas
- Electron wrapper for native app feel
- User accounts / cloud sync
- Audio/video moodboard support
- Figma import
