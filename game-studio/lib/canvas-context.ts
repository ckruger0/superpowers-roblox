import type { Editor, TLAsset, TLShapeId } from "tldraw";

export interface CanvasItem {
  id: string;
  type: "text" | "image" | "drawing";
  content: string;
  position: { x: number; y: number };
  imageData?: string; // base64 data URL for images and drawings
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

  if (src && (src.startsWith("data:image/") || src.startsWith("blob:"))) {
    return src;
  }

  return undefined;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Capture a drawing shape as a PNG base64 data URL using tldraw's SVG export
async function captureDrawingAsImage(
  editor: Editor,
  shapeId: string
): Promise<string | undefined> {
  try {
    // Get the SVG string for this shape
    const result = await editor.getSvgString([shapeId as TLShapeId], {
      padding: 16,
    });
    if (!result) return undefined;

    const { svg: svgString, width, height } = result;

    // Convert SVG to PNG via canvas
    const canvas = document.createElement("canvas");
    const scale = 2; // 2x for retina clarity
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    return new Promise<string | undefined>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.src = url;
    });
  } catch {
    return undefined;
  }
}

// Synchronous extraction — no drawing capture
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
        // imageData will be filled in by extractCanvasContextWithDrawings
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

// Async extraction that captures drawings as images
export async function extractCanvasContextWithDrawings(
  editor: Editor
): Promise<CanvasItem[]> {
  const items = extractCanvasContext(editor);

  // Capture all drawings as images in parallel
  const drawingCaptures = items
    .filter((item) => item.type === "drawing" && !item.imageData)
    .map(async (item) => {
      const imageData = await captureDrawingAsImage(editor, item.id);
      if (imageData) {
        item.imageData = imageData;
        item.content = "(freehand drawing) [image captured]";
      }
    });

  await Promise.all(drawingCaptures);

  return items;
}

export function buildCanvasPrompt(items: CanvasItem[]): string {
  if (items.length === 0) return "The canvas is empty.";

  let prompt = "Here's everything on the canvas right now:\n\n";
  for (const item of items) {
    if (item.type === "text") {
      prompt += `- Text (id: ${item.id}): "${item.content}"\n`;
    } else if (item.type === "image") {
      prompt += `- Image (id: ${item.id}): uploaded image${item.imageData ? " [image data attached]" : ""}\n`;
    } else if (item.type === "drawing") {
      prompt += `- Drawing (id: ${item.id}): freehand drawing${item.imageData ? " [drawing image attached — look at this carefully to understand what was drawn]" : ""}\n`;
    }
  }

  return prompt;
}
