import type { Editor } from "tldraw";

export interface CanvasItem {
  id: string;
  type: "text" | "image" | "drawing";
  content: string;
  position: { x: number; y: number };
}

// tldraw v3 uses richText (ProseMirror doc format) instead of plain text
function extractTextFromRichText(richText: unknown): string {
  if (!richText || typeof richText !== "object") return "";

  const rt = richText as { type?: string; content?: unknown[]; text?: string };

  // If it has a direct text field, use it
  if (typeof rt.text === "string") return rt.text;

  // ProseMirror doc structure: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] }
  if (rt.type === "doc" && Array.isArray(rt.content)) {
    const texts: string[] = [];
    for (const block of rt.content) {
      const b = block as { type?: string; content?: unknown[] };
      if (Array.isArray(b.content)) {
        for (const inline of b.content) {
          const i = inline as { text?: string };
          if (typeof i.text === "string") {
            texts.push(i.text);
          }
        }
      }
      texts.push("\n");
    }
    return texts.join("").trim();
  }

  return "";
}

function getShapeText(props: Record<string, unknown>): string {
  // Try richText first (tldraw v3+)
  if (props.richText) {
    const text = extractTextFromRichText(props.richText);
    if (text) return text;
  }
  // Fall back to plain text prop (older tldraw)
  if (typeof props.text === "string") {
    return props.text.trim();
  }
  return "";
}

export function extractCanvasContext(editor: Editor): CanvasItem[] {
  const items: CanvasItem[] = [];

  for (const shape of editor.getCurrentPageShapes()) {
    const bounds = editor.getShapePageBounds(shape.id);
    const pos = bounds
      ? { x: Math.round(bounds.x), y: Math.round(bounds.y) }
      : { x: 0, y: 0 };

    const props = shape.props as Record<string, unknown>;
    const textContent = getShapeText(props);

    if (shape.type === "text" || shape.type === "note" || shape.type === "geo") {
      if (textContent) {
        items.push({
          id: shape.id,
          type: "text",
          content: textContent,
          position: pos,
        });
      }
    } else if (shape.type === "image") {
      items.push({
        id: shape.id,
        type: "image",
        content: "(uploaded image)",
        position: pos,
      });
    } else if (shape.type === "draw") {
      items.push({
        id: shape.id,
        type: "drawing",
        content: "(freehand drawing)",
        position: pos,
      });
    } else if (textContent) {
      // Catch-all: any shape with text
      items.push({
        id: shape.id,
        type: "text",
        content: textContent,
        position: pos,
      });
    }
  }

  return items;
}

export function buildCanvasPrompt(items: CanvasItem[]): string {
  if (items.length === 0) return "The canvas is empty.";

  let prompt = "Here's everything on the canvas right now:\n\n";
  for (const item of items) {
    if (item.type === "text") {
      prompt += `- Text at (${item.position.x}, ${item.position.y}): "${item.content}"\n`;
    } else if (item.type === "image") {
      prompt += `- Image at (${item.position.x}, ${item.position.y})\n`;
    } else if (item.type === "drawing") {
      prompt += `- Drawing at (${item.position.x}, ${item.position.y})\n`;
    }
  }

  return prompt;
}
