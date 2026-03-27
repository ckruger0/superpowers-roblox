# Game Studio Web UI v2 — AI-Native Canvas

## Vision

A freeform infinite canvas where a kid dumps their creative chaos — sticky notes, images, sketches, half-formed ideas — and an AI watches, connects the dots, and gradually crystallizes it into a playable game. The AI lives ON the canvas as contextual bubbles, not in a sidebar.

This is not "chat app with a canvas." This is a shared thinking space between a human and an AI.

### The Interaction

1. Kid opens the app. Sees a clean infinite canvas with 3 tools: draw, text, and image (polaroid placeholder you drag from toolbar, click to upload).
2. Kid writes "lava obby" on a text block and clicks away.
3. A small AI bubble appears next to the text: "I see you wrote 'lava obby' — what'd you have in mind?" with 2-3 quick-reply buttons + freeform option.
4. Kid drags in a photo of a volcano.
5. The AI sees BOTH the text and the image, connects them: "OH! You want a lava obby inside a volcano — is that right?" Bubble appears near the image but references the text too.
6. Kid confirms. AI bubble: "Cool! Should the lava be rising to add time pressure, or just there as decoration?"
7. This continues — every new thing on the canvas triggers the AI to re-evaluate the full context and ask the next most useful question.
8. As decisions solidify, the GDD bento box at the bottom fills in.
9. Eventually the AI says "I think I have enough to build the first 2 rooms — want me to start?" and the build phase begins.

### Key Principles

- **Canvas is the conversation.** Not a sidebar. Not a modal. The AI's bubbles live spatially on the canvas, near the content they reference.
- **AI is reactive.** It watches for changes (new text placed, image uploaded, drawing made) and responds contextually. It never interrupts — it waits for the kid to finish and deselect.
- **Connect the dots.** The AI's primary job is finding relationships between scattered canvas items and asking "is THIS what you mean?"
- **Quick replies reduce friction.** Every AI bubble should offer 2-3 tappable options. Freeform is always available but never required.
- **History is secondary.** A collapsible timeline exists for reference, but the live canvas bubbles are the primary interface.

## Architecture

Same backend as v1 (Anthropic API + MCP client + skill loader), but the frontend is fundamentally different.

```
┌──────────────────────────────────┐
│   Browser (localhost:3000)       │
│                                  │
│   ┌────────────────────────────┐ │
│   │  Infinite Canvas (tldraw)  │ │
│   │                            │ │
│   │  [text] [image] [drawing]  │ │
│   │                            │ │
│   │  AI bubbles appear here    │ │
│   │  next to canvas content    │ │
│   └────────────────────────────┘ │
│                                  │
│   ┌────────────────────────────┐ │
│   │  GDD Bento Box (bottom)    │ │
│   └────────────────────────────┘ │
│                                  │
│   Timeline (collapsed, left edge)│
└──────────┬───────────────────────┘
           │
┌──────────▼───────────────────┐
│   Next.js Backend            │
│   - Anthropic API (Claude)   │
│   - MCP Client (Studio)      │
│   - Canvas context watcher   │
└──────────────────────────────┘
```

## Canvas Tools (minimal)

Only 3 tools in the toolbar:

1. **Text tool** — click anywhere to place a text block. Type, then click away.
2. **Draw tool** — freehand drawing. For sketching level layouts, circling things, arrows.
3. **Image tool** — drag a polaroid placeholder from the toolbar onto the canvas. Click the image area to upload/select a file. Or drag-and-drop images directly from desktop.

Plus tldraw's built-in select/pan/zoom. That's it. No color palette, no shape tools, no complexity.

## AI Bubble System

### Trigger: Canvas Change Detection

The frontend watches for canvas changes via tldraw's store subscription:
- New shape created (text placed, image uploaded, drawing made)
- Shape content changed (text edited)
- Shape deselected (kid finished editing)

On deselection or after a brief pause (500ms of no changes), the frontend:
1. Gathers ALL canvas content (text blocks → extracted text, images → sent for vision, drawings → described)
2. Sends the full canvas context to the backend
3. Backend runs Claude with the canvas context + conversation history
4. Response comes back with: message text, quick-reply options, and which canvas item to anchor the bubble to

### Bubble Component

A speech bubble that appears on the canvas near a specific item.

```
┌─────────────────────────────┐
│ I see you wrote "lava obby" │
│ — what'd you have in mind?  │
│                             │
│ [Scary obby] [Chill obby]  │
│ [Something else...]         │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │  lava obby   │  ← kid's text block
    └──────────────┘
```

**Bubble properties:**
- Anchored to a canvas item (follows it if moved)
- Shows AI message text
- 2-3 quick-reply buttons
- Optional freeform text input (expandable)
- Dismissable (click X or it fades after the kid responds)
- Only ONE active bubble at a time. Previous bubbles fade to a small dot that can be expanded.

**Bubble lifecycle:**
1. Canvas change detected → send context to AI
2. AI responds → create bubble anchored to the relevant item
3. Kid clicks a quick reply OR types freeform → send to AI
4. Previous bubble becomes a small history dot
5. New bubble appears (possibly anchored to a different item)

### Context Window

Every AI call includes:
- **All canvas items** — text content, image descriptions, positions, groupings
- **Conversation history** — previous bubble Q&As
- **Current GDD state** — what's been decided so far
- **Spatial relationships** — what's near what on the canvas (items placed close together are probably related)

The system prompt tells Claude: "You are watching a kid's creative canvas. They just added/changed [X]. Here's everything on the canvas: [full context]. Here's what you've discussed so far: [history]. Your job: find connections between items, ask the next most useful question, and offer 2-3 quick options. Keep it short and excited."

### Cross-Item Connection

When the AI notices relationships between canvas items:
- Draw a faint dotted line between related items on the canvas
- Bubble references both: "I see the volcano photo AND 'lava obby' — you want a volcano-themed obby?"
- These connections become the foundation of the GDD

## Timeline (History Panel)

Collapsible panel on the left edge. Shows chronological history of all AI interactions:
- Timestamp
- What triggered it (placed "lava obby", uploaded volcano.jpg)
- AI question
- Kid's response
- Any GDD updates that resulted

This is reference-only. The kid never needs to open it during normal flow.

## GDD Bento Box

Same as v1 — bottom bar with collapsible cards. But now it updates reactively:
- AI confirms "so it's a volcano-themed obby" → Vision card fills in
- AI confirms "rising lava for time pressure" → Mechanics card fills in
- Each card shows a subtle animation when it updates
- Cards go from empty → drafting → locked

## Build Phase Transition

When enough GDD sections are filled (Vision + Mechanics minimum), the AI bubble says:
"I think I have enough to build the first couple rooms. Want me to start?"

On "yes":
- Stage transitions from Ideate → Build
- Canvas gains room cards (similar to v1 build tracker)
- AI bubbles shift to build-related questions ("Does this lava look scary enough?")
- Screenshots from Roblox Studio appear as image cards on the canvas

## File Structure Changes from v1

Most of the backend stays the same. Frontend is rebuilt:

```
game-studio/
├── app/
│   ├── page.tsx                 # Clean canvas page
│   └── api/
│       ├── chat/route.ts        # Now: canvas context → AI response
│       └── mcp/status/route.ts
├── components/
│   ├── canvas/
│   │   ├── GameCanvas.tsx       # tldraw canvas with minimal tools
│   │   ├── AIBubble.tsx         # Speech bubble component
│   │   ├── BubbleManager.tsx    # Manages bubble lifecycle
│   │   ├── ImagePlaceholder.tsx # Polaroid drag-and-drop shape
│   │   └── CanvasWatcher.tsx    # Detects changes, triggers AI
│   ├── gdd/
│   │   └── GDDBentoBox.tsx      # Same as v1 (bottom bar)
│   └── timeline/
│       └── Timeline.tsx         # Collapsible history panel
├── lib/
│   ├── anthropic.ts             # Same
│   ├── mcp-client.ts            # Same
│   ├── skill-loader.ts          # Same
│   ├── gdd.ts                   # Same
│   ├── canvas-context.ts        # NEW: extracts context from canvas state
│   └── types.ts                 # Updated with bubble types
└── ...
```

## API Changes

### `/api/chat` request shape changes

```typescript
{
  // Full canvas state
  canvasItems: Array<{
    id: string;
    type: "text" | "image" | "drawing";
    content: string;        // text content, image description, or "freehand drawing"
    position: { x: number; y: number };
    imageData?: string;     // base64 for images (sent to Claude vision)
  }>;

  // What just changed
  trigger: {
    type: "item_added" | "item_changed" | "item_deselected" | "quick_reply" | "freeform";
    itemId?: string;        // which canvas item triggered this
    replyText?: string;     // if quick_reply or freeform
  };

  // Previous conversation
  history: Array<{
    role: "assistant" | "user";
    content: string;
  }>;

  // Current GDD
  gdd: GameDesignDoc;
}
```

### `/api/chat` response shape changes

```typescript
{
  message: string;              // AI bubble text
  anchorItemId: string;         // which canvas item to anchor the bubble to
  quickReplies: Array<{
    label: string;
    value: string;
  }>;
  showFreeformInput: boolean;
  connections?: Array<{         // items the AI connected
    fromId: string;
    toId: string;
  }>;
  gddUpdates?: {               // if AI is ready to fill in GDD sections
    section: "vision" | "mechanics" | "narrative" | "levelPlan";
    content: string;
    status: "drafting" | "locked";
  }[];
}
```

## Scope for v2 Rebuild

**In scope:**
- Minimal canvas (text, draw, image tools only)
- AI bubble system (appear on canvas, quick replies, freeform)
- Canvas change detection → AI trigger
- Cross-item connection (dotted lines)
- GDD bento box (same as v1, reactive updates)
- Timeline history (collapsible, reference only)

**Out of scope:**
- Build phase (screenshots, room cards) — v3
- MCP integration during ideation — not needed until build phase
- Multi-image vision analysis — start with one image at a time
- Collaborative canvas
