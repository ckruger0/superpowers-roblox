import type { Editor, TLAsset } from "tldraw";

export interface CanvasItem {
  id: string;
  type: "text" | "image" | "drawing";
  content: string;
  position: { x: number; y: number };
  imageData?: string; // base64 data URL for images
}

// tldraw v3 uses richText (ProseMirror doc format) instead of plain text
function extractTextFromRichText(richText: unknown): string {
  if (!richText || typeof richText !== "object") return "";

  const rt = richText as { type?: string; content?: unknown[]; text?: string };

  if (typeof rt.text === "string") return rt.text;

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
  if (props.richText) {
    const text = extractTextFromRichText(props.richText);
    if (text) return text;
  }
  if (typeof props.text === "string") {
    return props.text.trim();
  }
  return "";
}

function getImageDataUrl(editor: Editor, assetId: string): string | undefined {
  const asset = editor.getAsset(assetId as TLAsset["id"]);
  if (!asset) return undefined;

  const props = asset.props as Record<string, unknown>;
  const src = props.src as string | undefined;

  // tldraw stores uploaded images as base64 data URLs or blob URLs
  if (src && (src.startsWith("data:image/") || src.startsWith("blob:"))) {
    return src;
  }

  return undefined;
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
      const assetId = props.assetId as string | undefined;
      const imageData = assetId ? getImageDataUrl(editor, assetId) : undefined;

      items.push({
        id: shape.id,
        type: "image",
        content: "(uploaded image)",
        position: pos,
        imageData,
      });
    } else if (shape.type === "draw") {
      items.push({
        id: shape.id,
        type: "drawing",
        content: "(freehand drawing)",
        position: pos,
      });
    } else if (textContent) {
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
      prompt += `- Text (id: ${item.id}): "${item.content}"\n`;
    } else if (item.type === "image") {
      prompt += `- Image (id: ${item.id}): uploaded image${item.imageData ? " [image data attached below]" : " [no image data available]"}\n`;
    } else if (item.type === "drawing") {
      prompt += `- Drawing (id: ${item.id}): freehand drawing\n`;
    }
  }

  return prompt;
}
