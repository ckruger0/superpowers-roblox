"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, Editor, TLShapeId, TLComponents } from "tldraw";
import "tldraw/tldraw.css";
import AIBubble, { QuickReply } from "./AIBubble";
import CanvasToolbar from "./CanvasToolbar";
import { extractCanvasContext, extractCanvasContextWithDrawings, buildCanvasPrompt } from "@/lib/canvas-context";
import type { GameDesignDoc } from "@/lib/types";
import type { Theme } from "@/lib/themes";

const TLDRAW_LICENSE =
  "tldraw-2026-06-22/WyJVc3NwazFPQiIsWyIqIl0sMTYsIjIwMjYtMDYtMjIiXQ.F/7993pPgWC+etoylsfs4uwen7ECd5ozjOXeGutxjO9A8gfDfYMbKl3FtOBEM/6U6Ej79sgSX24bYzl51WDaXw";

interface BubbleState {
  message: string;
  quickReplies: QuickReply[];
  anchorId: string;
  screenPosition: { x: number; y: number };
  dragOffset?: { x: number; y: number };
}

interface HistoryEntry {
  timestamp: number;
  trigger: string;
  aiMessage: string;
  userReply?: string;
}

interface GameCanvasProps {
  onGddUpdate?: (section: string, content: string, status: string) => void;
  onHistoryChange?: (history: HistoryEntry[]) => void;
  gdd?: GameDesignDoc;
  theme?: Theme;
}

// Hide ALL of tldraw's built-in UI — we provide our own toolbar
const components: TLComponents = {
  StylePanel: null,
  NavigationPanel: null,
  PageMenu: null,
  ActionsMenu: null,
  MainMenu: null,
  DebugPanel: null,
  DebugMenu: null,
  HelpMenu: null,
  QuickActions: null,
  SharePanel: null,
  Toolbar: null,
  KeyboardShortcutsDialog: null,
  HelperButtons: null,
  MenuPanel: null,
  Minimap: null,
  ZoomMenu: null,
};

export default function GameCanvas({ onGddUpdate, onHistoryChange, gdd, theme }: GameCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [, setHistory] = useState<HistoryEntry[]>([]);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastItemCountRef = useRef(0);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
    editor.user.updateUserPreferences({ colorScheme: "light" });

    // Track active tool changes
    editor.store.listen(
      () => {
        const tool = editor.getCurrentToolId();
        setActiveTool(tool);
      },
      { source: "user", scope: "session" }
    );
  }, []);

  const getShapeScreenPos = useCallback(
    (shapeId: string): { x: number; y: number } | null => {
      if (!editor) return null;
      const bounds = editor.getShapePageBounds(shapeId as TLShapeId);
      if (!bounds) return null;
      const screenPoint = editor.pageToScreen({
        x: bounds.x + bounds.width / 2,
        y: bounds.y,
      });
      return { x: screenPoint.x, y: screenPoint.y };
    },
    [editor]
  );

  const askAI = useCallback(
    async (triggerItemId?: string, replyText?: string) => {
      if (!editor || isThinking) return;
      setIsThinking(true);

      // Use async extraction to capture drawings as images
      const items = await extractCanvasContextWithDrawings(editor);
      if (items.length === 0 && !replyText) {
        setIsThinking(false);
        return;
      }

      const canvasPrompt = buildCanvasPrompt(items);

      let triggerDesc = "The user is working on their canvas.";
      if (triggerItemId) {
        const item = items.find((i) => i.id === triggerItemId);
        if (item) {
          triggerDesc = `The user just ${item.type === "text" ? `wrote "${item.content}"` : item.type === "image" ? "uploaded an image" : "made a drawing"}.`;
        }
      }
      if (replyText) {
        triggerDesc = `The user replied: "${replyText}"`;
      }

      // Build GDD context
      const gddSections: string[] = [];
      if (gdd) {
        if (gdd.vision.content) gddSections.push(`Vision (${gdd.vision.status}): ${gdd.vision.content}`);
        if (gdd.mechanics.content) gddSections.push(`Mechanics (${gdd.mechanics.status}): ${gdd.mechanics.content}`);
        if (gdd.narrative.content) gddSections.push(`Narrative (${gdd.narrative.status}): ${gdd.narrative.content}`);
        if (gdd.levelPlan.content) gddSections.push(`Level Plan (${gdd.levelPlan.status}): ${gdd.levelPlan.content}`);
      }
      const gddContext = gddSections.length > 0
        ? `\n## What We've Decided So Far (Game Design Doc)\n${gddSections.join("\n")}`
        : "\n## Game Design Doc\nNothing decided yet — we're still exploring.";

      const systemPrompt = `You are an AI creative director helping a kid design a Roblox game. You live on their creative canvas — they dump ideas (text, images, drawings) and you connect the dots into a game concept.

## Your Role
You are watching a shared creative space in real time. Every time something new appears or the user responds, you see the FULL canvas plus everything discussed so far. Your job is to:
1. Notice what just changed (the trigger)
2. Connect it to everything ELSE on the canvas and in the conversation
3. Push the game design forward with one focused question or observation

## Canvas Right Now
${canvasPrompt}
${gddContext}

## Conversation History
${conversationRef.current.map((m) => `${m.role === "user" ? "Kid" : "You"}: ${m.content}`).join("\n") || "(First interaction — welcome them!)"}

## Rules
- SHORT messages: 1-2 sentences max. You're a speech bubble, not an essay.
- CONNECT THE DOTS: When you see a new item, relate it to existing items. "Oh! The volcano picture + 'lava obby' — you want a lava obby INSIDE a volcano?"
- Reference specific canvas items by quoting their text or describing images.
- 2-3 quick reply buttons that move design forward. Make them specific, not generic.
- ONE question at a time. Never ask two things.
- When enough context exists for a GDD section, include a gddUpdate to fill it in.
- Be genuinely excited — you're building a game with a kid!
- If this is the first interaction, react to what's on the canvas with enthusiasm and ask what they have in mind.

## When to Update the Game Design Doc
- "vision": When you understand the core idea (game type + vibe + setting)
- "mechanics": When a core gameplay mechanic is confirmed (not just mentioned — confirmed by the kid)
- "narrative": When the story/motivation/atmosphere is clear
- "levelPlan": When there's a rough structure (how many sections, difficulty progression)
Use status "drafting" for proposals, "locked" when the kid confirms.

IMPORTANT: Respond with valid JSON only:
{
  "message": "your message text",
  "quickReplies": [{"label": "Short Button Text", "value": "what this means"}],
  "anchorItemId": "id of the canvas item to show the bubble near — pick the NEWEST relevant one",
  "gddUpdates": [{"section": "vision|mechanics|narrative|levelPlan", "content": "...", "status": "drafting|locked"}] or null
}`;

      const userMessage = triggerDesc;
      conversationRef.current.push({ role: "user", content: userMessage });

      // Build multimodal content — text + any images on the canvas
      const messageContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      // Add the text prompt
      messageContent.push({
        type: "text",
        text: systemPrompt + "\n\nTrigger: " + userMessage,
      });

      // Attach images from canvas as vision content
      for (const item of items) {
        if ((item.type === "image" || item.type === "drawing") && item.imageData && item.imageData.startsWith("data:image/")) {
          // Extract base64 and media type from data URL
          const match = item.imageData.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (match) {
            messageContent.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            });
          }
        }
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: messageContent }],
            skill: "__raw__",
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader");

        let fullText = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ") && eventType === "text") {
              try {
                const data = JSON.parse(line.slice(6));
                fullText += data.text;
              } catch { /* partial */ }
            }
          }
        }

        // Parse AI response — try JSON first, fall back to plain text
        let aiMessage = "";
        let quickReplies: QuickReply[] = [];
        let gddUpdates: Array<{ section: string; content: string; status: string }> | null = null;

        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiMessage = parsed.message || "";
            quickReplies = parsed.quickReplies || [];
            gddUpdates = parsed.gddUpdates || null;
          }
        } catch {
          // JSON parse failed — use the raw text as the message
          aiMessage = fullText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        }

        // If we still have no message, use the full text
        if (!aiMessage && fullText.trim()) {
          aiMessage = fullText.trim();
        }

        if (aiMessage) {
          conversationRef.current.push({ role: "assistant", content: aiMessage });

          // Always anchor to the trigger item, falling back to newest item
          const anchorId = triggerItemId || items[items.length - 1]?.id || "";
          const screenPos = anchorId ? getShapeScreenPos(anchorId) : null;

          setBubble({
            message: aiMessage,
            quickReplies,
            anchorId,
            screenPosition: screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 3 },
          });

          setHistory((prev) => {
            const next = [...prev, { timestamp: Date.now(), trigger: triggerDesc, aiMessage }];
            onHistoryChange?.(next);
            return next;
          });

          if (gddUpdates) {
            for (const update of gddUpdates) {
              onGddUpdate?.(update.section, update.content, update.status);
            }
          }
        }
      } catch (error) {
        console.error("AI error:", error);
      } finally {
        setIsThinking(false);
      }
    },
    [editor, isThinking, getShapeScreenPos, onGddUpdate, onHistoryChange]
  );

  // Track canvas changes
  const pendingTriggerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const unsubDoc = editor.store.listen(
      () => {
        const items = extractCanvasContext(editor);
        if (items.length !== lastItemCountRef.current && items.length > 0) {
          lastItemCountRef.current = items.length;
          const newest = items[items.length - 1];
          pendingTriggerRef.current = newest?.id ?? null;
        }
      },
      { source: "user", scope: "document" }
    );

    const unsubSession = editor.store.listen(
      () => {
        const selectedIds = editor.getSelectedShapeIds();
        if (selectedIds.length === 0 && pendingTriggerRef.current) {
          const triggerId = pendingTriggerRef.current;
          pendingTriggerRef.current = null;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            askAI(triggerId);
          }, 600);
        }
      },
      { source: "user", scope: "session" }
    );

    return () => {
      unsubDoc();
      unsubSession();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, askAI]);

  // Update bubble position when canvas pans/zooms
  useEffect(() => {
    if (!editor || !bubble || bubble.dragOffset) return;

    const updateBubblePos = () => {
      const pos = getShapeScreenPos(bubble.anchorId);
      if (pos) {
        setBubble((prev) => (prev ? { ...prev, screenPosition: pos } : null));
      }
    };

    const unsubscribe = editor.store.listen(updateBubblePos, {
      source: "user",
      scope: "session",
    });

    return unsubscribe;
  }, [editor, bubble?.anchorId, bubble?.dragOffset, getShapeScreenPos]);

  const handleBubbleReply = (text: string) => {
    setHistory((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].userReply = text;
      }
      onHistoryChange?.(updated);
      return updated;
    });
    setBubble(null);
    askAI(undefined, text);
  };

  return (
    <div className="w-full h-full relative">
      <style jsx global>{`
        .tlui-style-panel__wrapper,
        .tlui-menu-zone,
        .tlui-helper-buttons,
        .tlui-toolbar,
        .tlui-navigation-zone {
          display: none !important;
        }
        .tl-background {
          background-color: ${theme?.canvasBg ?? "#ece5dd"} !important;
        }
        .tl-canvas {
          background-color: transparent !important;
        }
      `}</style>

      <Tldraw
        licenseKey={TLDRAW_LICENSE}
        onMount={handleMount}
        components={components}
      />

      {/* Custom toolbar */}
      <CanvasToolbar
        editor={editor}
        activeTool={activeTool}
        theme={theme}
        onImageAdded={(shapeId) => {
          const items = editor ? extractCanvasContext(editor) : [];
          lastItemCountRef.current = items.length;
          setTimeout(() => askAI(shapeId), 300);
        }}
      />

      {/* AI thinking indicator */}
      {isThinking && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 ${theme?.toolbarBg ?? "bg-[#f5f0eb]"} border ${theme?.toolbarBorder ?? "border-[#e8dfd6]"} rounded-full px-3 py-1 flex items-center gap-2 shadow-lg transition-colors duration-300`}>
          <div className={`w-1.5 h-1.5 rounded-full ${theme?.thinkingColor ?? "bg-[#c5a3d9]"} animate-pulse`} />
          <span className={`${theme?.toolbarText ?? "text-[#8a7d6b]"} text-[11px]`}>Thinking...</span>
        </div>
      )}

      {/* AI Bubble */}
      {bubble && (
        <AIBubble
          message={bubble.message}
          quickReplies={bubble.quickReplies}
          position={bubble.screenPosition}
          onReply={handleBubbleReply}
          onDismiss={() => setBubble(null)}
          draggable
          theme={theme}
        />
      )}
    </div>
  );
}
