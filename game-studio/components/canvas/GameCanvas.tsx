"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, Editor, TLShapeId, TLComponents } from "tldraw";
import "tldraw/tldraw.css";
import AIBubble, { QuickReply } from "./AIBubble";
import { extractCanvasContext, buildCanvasPrompt } from "@/lib/canvas-context";

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
}

// Hide most of tldraw's UI — we only want select, draw, text
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
};

export default function GameCanvas({ onGddUpdate, onHistoryChange }: GameCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [, setHistory] = useState<HistoryEntry[]>([]);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastItemCountRef = useRef(0);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
    editor.user.updateUserPreferences({ colorScheme: "dark" });
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

      const items = extractCanvasContext(editor);
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

      const systemPrompt = `You are an AI creative director helping a kid design a Roblox game. You live on their creative canvas — they're placing text notes, images, and drawings, and your job is to connect the dots into a game concept.

Rules:
- Be excited and encouraging. Match the energy of a creative kid.
- Keep messages SHORT — 1-2 sentences max.
- Reference specific things on the canvas by quoting them.
- When you notice connections between items, call them out enthusiastically.
- Always suggest 2-3 quick reply options that move the design forward.
- Don't ask more than one question at a time.
- As the game concept solidifies, fill in the game design document sections.

${canvasPrompt}

Conversation so far:
${conversationRef.current.map((m) => `${m.role}: ${m.content}`).join("\n") || "(none yet)"}

IMPORTANT: Respond with valid JSON only:
{
  "message": "your message text",
  "quickReplies": [{"label": "Button Text", "value": "response value"}, ...],
  "anchorItemId": "id of the canvas item to anchor the bubble to (pick the most relevant one)",
  "gddUpdates": [{"section": "vision|mechanics|narrative|levelPlan", "content": "...", "status": "drafting|locked"}] or null
}`;

      const userMessage = triggerDesc;
      conversationRef.current.push({ role: "user", content: userMessage });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: systemPrompt + "\n\nTrigger: " + userMessage }],
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

        let parsed;
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          parsed = null;
        }

        if (parsed?.message) {
          conversationRef.current.push({ role: "assistant", content: parsed.message });

          const anchorId = parsed.anchorItemId || triggerItemId || items[items.length - 1]?.id;
          const screenPos = anchorId ? getShapeScreenPos(anchorId) : null;

          setBubble({
            message: parsed.message,
            quickReplies: parsed.quickReplies || [],
            anchorId: anchorId || "",
            screenPosition: screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 3 },
          });

          const entry: HistoryEntry = {
            timestamp: Date.now(),
            trigger: triggerDesc,
            aiMessage: parsed.message,
          };
          setHistory((prev) => {
            const next = [...prev, entry];
            onHistoryChange?.(next);
            return next;
          });

          if (parsed.gddUpdates) {
            for (const update of parsed.gddUpdates) {
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
        /* Hide tldraw panels we replaced */
        .tlui-style-panel__wrapper,
        .tlui-menu-zone,
        .tlui-helper-buttons {
          display: none !important;
        }
        /* Only show select, hand, draw, text, and asset tools */
        .tlui-toolbar .tlui-toolbar__tools {
          gap: 2px;
        }
        /* Hide tools we don't want */
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.eraser"],
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.arrow"],
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.laser"],
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.frame"],
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.highlight"],
        .tlui-toolbar .tlui-toolbar__tools button[data-testid="tools.note"],
        .tlui-toolbar .tlui-toolbar__extras,
        .tlui-toolbar__overflow {
          display: none !important;
        }
      `}</style>

      <Tldraw
        licenseKey={TLDRAW_LICENSE}
        onMount={handleMount}
        components={components}
      />

      {/* AI thinking indicator */}
      {isThinking && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-neutral-400 text-[11px]">Thinking...</span>
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
        />
      )}
    </div>
  );
}
