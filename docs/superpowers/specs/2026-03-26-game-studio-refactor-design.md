# Game Studio in a Box — Skill Suite Refactor

## Vision

A modular AI game studio that mirrors how real game development works. Each skill maps to a role on a game development team. A persistent game design document (GDD) ties everything together across sessions. The primary audience is young creators (ages 8-17) who have an abstract vision for a game but don't understand the full development process.

The system should feel like a **paintbrush, not autopilot** — the kid always feels that the result is something they took part in. Auto-dispatch skills behind the scenes, but surface creative decision points at every step so the kid feels ownership.

The tone adapts to the creator: simpler language and more hand-holding for younger kids, more design theory and nuance for teens who know Roblox Studio basics.

### Speed to Magic Moment

The #1 design constraint. A kid should go from "I want a scary obby with lava" to **playing a rough version of their game** as fast as possible. Real feedback comes from playing, not from answering design questions.

**Rules:**
- **Phase 1 (Connect) is 2-3 questions max.** Just enough to understand the vibe and one core mechanic. Not a full design interview.
- **Phase 2 (Design) produces a minimum viable design, not a complete one.** Enough to build the first 2-3 rooms. Details for later rooms come later.
- **Phase 3 (Plan) is a single confirmation, not a document review.** "Here's what I'm building first: [2 sentences]. Let's go?"
- **Phase 4 (Build) starts within minutes, not after 20 questions.** Build the spawn room and first challenge room. Then playtest immediately.
- **First playtest happens ASAP.** The kid plays their own game within the first session. Everything after that is iteration based on real experience, not hypotheticals.

The creative specialists still run — but in round 1 they're scoped to "what do we need to build the first playable slice?" Not "design the entire game." The full game design emerges iteratively as the kid plays, reacts, and asks for more.

```
"I want a scary obby with lava"
    │
    2-3 questions (1 min)
    │
    Parallel specialists — first slice only (30 sec)
    │
    "Building your first 2 rooms now"
    │
    Build + screenshot loop (2-3 min)
    │
    "Hit play and try it!"  ← MAGIC MOMENT
    │
    "What do you think? What should we add next?"
    │
    ... iterate forever ...
```

### Agent Swarm Architecture

The orchestrators (`new-game`, `edit-game`) operate as **reconcilers** in an agent swarm model:

- **Creative specialists run in parallel.** When the orchestrator needs design input, it dispatches all relevant specialists simultaneously. Each specialist works independently and returns its ideas.
- **The orchestrator reconciles.** It synthesizes the parallel outputs, resolves conflicts, identifies dependencies, and presents a unified set of questions/options to the kid. The kid never sees the agent boundaries — just a coherent creative conversation.
- **Frequent user input.** The swarm should surface decision points often. The kid should feel like ideas are flowing fast and they're picking the best ones, not waiting for a monologue.
- **Dependency loops.** When one specialist's output depends on another's (e.g., level pacing depends on which mechanics were approved), the orchestrator runs a second pass: sends the approved decisions back to dependent specialists for refinement. This loop repeats until the design is internally consistent.

```
Orchestrator dispatches specialists in parallel
         │
    ┌────┼────────────┐
    ▼    ▼            ▼
mechanics  narrative  level-designer
    │    │            │
    └────┼────────────┘
         ▼
Orchestrator reconciles outputs
         │
         ▼
Presents unified options to kid
         │
         ▼
Kid chooses / tweaks
         │
         ▼
Dependency check: do any specialists
need to revise based on kid's choices?
         │
    ┌────┴────┐
    yes       no
    │         │
    ▼         ▼
Re-dispatch   Move to next phase
affected      (or next design question)
specialists
```

This same pattern applies during the build phase — production skills run in parallel where possible (e.g., building room 2 while screenshotting room 1), with the orchestrator reconciling and checking in with the kid at creative decision points.

## Skill Roster

### Entry Points (user-facing)

| Skill | Studio Role | Purpose |
|---|---|---|
| `new-game` | Creative Director | Start a new game from scratch. Brainstorms the idea with the kid, dispatches creative specialists, produces the GDD, then kicks off the first build cycle. |
| `edit-game` | Creative Director | Pick up an existing game. Reads the GDD + dev log, asks what the kid wants to change or improve, dispatches the right specialists and production skills. |

### Creative Specialists (dispatched during design, also callable standalone)

| Skill | Studio Role | What they push on |
|---|---|---|
| `mechanics-designer` | Mechanics Engineer | Gameplay systems — risk/reward, difficulty curves, player abilities, interactive elements. "What if the lava rises?", "What if platforms crumble after 3 seconds?", "Should there be checkpoints?" |
| `narrative-designer` | Story Architect | Motivation, atmosphere, story arcs, emotional beats. "Why is the player here?", "What's at the end?", "What makes this scary vs just hard?" |
| `level-designer` | Level Flow Planner | Pacing, progression, spatial structure, difficulty ramp. "First 3 rooms build confidence, then the crumbling platforms hit", "Room 7 needs a breather before the boss." |

### Production Team (dispatched during build, also callable standalone)

| Skill | Studio Role | Purpose |
|---|---|---|
| `build` | World Builder | Composes scenes from Creator Store assets. Batch placement (3-5 objects), logic + visual verification after each batch. Focused on 3D composition — creative decisions live in the specialists. |
| `add-asset` | Prop Artist | Atomic skill: search Creator Store, insert, sanitize scripts, position, verify placement. Building block used by `build`. |
| `screenshot` | Cinematographer | Smart camera positioning via `luau/smart-camera.luau`, viewport capture via `screen_capture` MCP tool. Used for visual verification throughout. |
| `review-game` | Design Reviewer | Evaluates the game against the GDD and design theory (Koster, Schell, flow theory). Conversational — asks about intent before judging. |
| `review-layout` | Level Reviewer | Spatial analysis — spawn orientation, sightlines, dead ends, affordance traps, distances between landmarks. Uses `luau/spatial-analysis.luau` and related helpers. |
| `playtest` | QA Tester | Actually plays the game via MCP (spawns, navigates, jumps, clicks). Reports first-person experience as narrative. Can trigger specialists if it finds issues (e.g., dispatches `mechanics-designer` if a section is boring). |

## The Game Design Document (GDD)

The connective tissue across all skills and sessions. Written by `new-game`, read and updated by everything else.

### Location

`game-design-doc.md` in the project root (next to the .rbxl file).

### Structure

```markdown
# [Game Title]

## Vision
The creator's original idea and the vibe they're going for.
One paragraph, in the kid's own words as much as possible.

## Core Mechanics
- What the player does moment-to-moment
- What makes it fun (the "juice")
- Risk/reward dynamics
- Player abilities and constraints

## Narrative
- Setting and atmosphere
- Player motivation (why are they here?)
- Story arc (if any)
- Emotional beats (scary, triumphant, funny, tense)

## Level Plan
Room-by-room or section-by-section breakdown:
- Layout and progression order
- Difficulty curve
- Key mechanics introduced per section
- Pacing notes (breathers, ramp-ups, climaxes)

## Dev Log
Timestamped entries, newest first. Any skill that makes a design decision appends here.

### [YYYY-MM-DD HH:MM] — [Skill Name]
What was done, what decisions were made, what feedback the creator gave.
```

### Rules

- Every skill that modifies the game or the design MUST append to the dev log.
- The GDD sections (Vision, Core Mechanics, Narrative, Level Plan) are updated when design decisions change them — not just appended to.
- The dev log is append-only. Never delete entries.
- `edit-game` reads the full GDD before doing anything.

## Flow: new-game

```
Kid: "I want to make a scary obby with lava"
  │
  ▼
new-game (Creative Director)
  │
  ├─ Phase 1: CONNECT
  │   Get excited about the idea. Ask 2-3 casual questions to understand the vibe.
  │   "That sounds awesome! When you say scary, do you mean like jump scares
  │    or more like creepy atmosphere?"
  │
  ├─ Phase 2: DESIGN (parallel specialist dispatch + reconciliation loops)
  │
  │   Round 1 — All specialists run in parallel with the kid's idea:
  │   ├─ mechanics-designer → rising lava, crumbling platforms, checkpoints
  │   ├─ narrative-designer → volcano escape, portal at the top, rescue mission
  │   └─ level-designer → 8 rooms, difficulty ramp, breather placement
  │
  │   Orchestrator reconciles and presents unified options:
  │   "OK here's what the team came up with! For mechanics, we could do
  │    rising lava AND crumbling platforms, or just rising lava for a
  │    cleaner feel. For the story, you're escaping a volcano — what's
  │    at the top: a portal, a helicopter, or are you rescuing someone?
  │    And for the level flow: 8 rooms, starting easy and ramping up.
  │    What sounds right?"
  │   → Kid: "rising lava only, portal at top, and make room 5 a breather"
  │
  │   Round 2 — Re-dispatch affected specialists with kid's choices:
  │   ├─ level-designer → revises room plan: room 5 is now a breather,
  │   │   adjusts difficulty curve around it
  │   └─ narrative-designer → integrates portal into story arc,
  │       each room gets a narrative beat leading to the escape
  │
  │   Orchestrator presents refined design for approval.
  │   Loops until internally consistent and kid is happy.
  │
  ├─ Phase 3: PLAN
  │   Present the full game design plan back to the kid in simple language.
  │   "Here's what we're building: [summary]. Sound right?"
  │   Write the GDD on approval.
  │
  └─ Phase 4: BUILD (dispatch production team)
      Auto-dispatch, but check in at every creative decision point.
      │
      ├─ build → spawn room
      ├─ screenshot → "Here's the spawn area. Does this feel right?"
      ├─ build → first lava chamber
      ├─ screenshot → "Does this lava look cool or should we make it spookier?"
      │   → Kid: "spookier"
      ├─ build → adjust lighting, add particle effects
      ├─ screenshot → "How about now?"
      │   → Kid: "perfect"
      ├─ ... continues room by room
      ├─ review-layout → check spatial flow of completed sections
      └─ Dev log updated throughout
```

## Flow: edit-game

```
Kid: "the middle part is boring"
  │
  ▼
edit-game (reads GDD + dev log)
  │
  ├─ "Looking at your game... rooms 4-6 are all platform jumping with the
  │   same lava speed. That might be why it feels samey. Let me get some ideas."
  │
  ├─ Dispatches playtest → replays rooms 4-6
  │   "I played through rooms 4-6. Room 4 was fun because the lava was new.
  │    But by room 6 I was just doing the same thing. No new surprises."
  │
  ├─ Dispatches mechanics-designer
  │   "What if room 5 has disappearing platforms? And room 6 has wind
  │    that pushes you sideways? Each room adds one new thing to think about."
  │
  ├─ Kid picks what they like
  │
  ├─ Updates GDD (Core Mechanics + Level Plan sections)
  │
  ├─ Dispatches build → implements changes
  │
  └─ Dev log updated
```

## Rename Map

Existing skills that get renamed (content stays the same for now):

| Current | New | Files to rename |
|---|---|---|
| `game-design-audit` | `review-game` | `skills/game-design-audit/` → `skills/review-game/`, command file, SKILL.md frontmatter |
| `spatial-flow` | `review-layout` | `skills/spatial-flow/` → `skills/review-layout/`, command file, SKILL.md frontmatter |
| `playtest-audit` | `playtest` | `skills/playtest-audit/` → `skills/playtest/`, command file, SKILL.md frontmatter |
| `visual-check` | `screenshot` | `skills/visual-check/` → `skills/screenshot/`, command file, SKILL.md frontmatter |
| `build-scene` | `build` | `skills/build-scene/` → `skills/build/`, command file, SKILL.md frontmatter |
| `add-asset` | `add-asset` | No change |

## New Skills to Write

1. **`new-game`** — Orchestrator for new game creation. Phases: Connect, Design (dispatch specialists), Plan (write GDD), Build (dispatch production team with creative checkpoints).

2. **`edit-game`** — Orchestrator for iterating on an existing game. Reads GDD + dev log, understands current state, dispatches appropriate specialists and production skills based on what the kid wants to change.

3. **`mechanics-designer`** — Creative specialist for gameplay systems. Pushes on: core mechanic variations, risk/reward, difficulty curves, interactive elements, player abilities, power-ups, hazards. Should propose concrete, exciting ideas (not abstract theory). Reads the GDD for context.

4. **`narrative-designer`** — Creative specialist for story and atmosphere. Pushes on: player motivation, setting, story arcs, emotional beats, environmental storytelling, theming consistency. Makes narrative feel integrated with mechanics, not bolted on.

5. **`level-designer`** — Creative specialist for pacing and progression. Pushes on: difficulty ramp, section ordering, breathers vs intensity, introduction of new mechanics, spatial flow at the macro level (not individual room layout — that's `review-layout`). Works closely with the level plan section of the GDD.

## Cross-References to Update

After renaming, update all internal references:

- `skills/build-scene/SKILL.md` references `add-asset` and `visual-check` → update to `add-asset` and `screenshot`
- `skills/spatial-flow/SKILL.md` references `game-design-audit` → update to `review-game`
- `skills/playtest-audit/SKILL.md` references `game-design-audit` and `spatial-flow` → update to `review-game` and `review-layout`
- `skills/visual-check/SKILL.md` references `spatial-flow` → update to `review-layout`
- `CLAUDE.md` references all old skill names → update all
- `README.md` references all old command names → update all
- `.claude/commands/` files reference old skill paths → update all

## Files to Update

### New files
- `skills/new-game/SKILL.md`
- `skills/edit-game/SKILL.md`
- `skills/mechanics-designer/SKILL.md`
- `skills/narrative-designer/SKILL.md`
- `skills/level-designer/SKILL.md`
- `.claude/commands/new-game.md`
- `.claude/commands/edit-game.md`
- `.claude/commands/mechanics-designer.md`
- `.claude/commands/narrative-designer.md`
- `.claude/commands/level-designer.md`

### Renamed files
- `skills/game-design-audit/` → `skills/review-game/`
- `skills/spatial-flow/` → `skills/review-layout/`
- `skills/playtest-audit/` → `skills/playtest/`
- `skills/visual-check/` → `skills/screenshot/`
- `skills/build-scene/` → `skills/build/`
- `.claude/commands/game-design-audit.md` → `.claude/commands/review-game.md`
- `.claude/commands/spatial-flow.md` → `.claude/commands/review-layout.md`
- `.claude/commands/playtest-audit.md` → `.claude/commands/playtest.md`
- `.claude/commands/visual-check.md` → `.claude/commands/screenshot.md`
- `.claude/commands/build-scene.md` → `.claude/commands/build.md`

### Updated files
- `CLAUDE.md` — update all skill/command references
- `README.md` — rewrite to reflect new structure, studio metaphor, young audience
- `.claude-plugin/plugin.json` — update description
- `.claude-plugin/marketplace.json` — update description
- All existing SKILL.md files — update cross-references to use new names
