import type { Editor } from "tldraw";

export interface CanvasItem {
  id: string;
  type: "text" | "image" | "drawing";
  content: string;
  position: { x: number; y: number };
}

export function extractCanvasContext(editor: Editor): CanvasItem[] {
  const items: CanvasItem[] = [];

  for (const shape of editor.getCurrentPageShapes()) {
    const bounds = editor.getShapePageBounds(shape.id);
    const pos = bounds
      ? { x: Math.round(bounds.x), y: Math.round(bounds.y) }
      : { x: 0, y: 0 };

    if (shape.type === "text") {
      const props = shape.props as { text?: string };
      if (props.text?.trim()) {
        items.push({
          id: shape.id,
          type: "text",
          content: props.text.trim(),
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
