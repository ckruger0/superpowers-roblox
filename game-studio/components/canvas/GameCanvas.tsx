"use client";

import { useCallback, useEffect, useState } from "react";
import { Tldraw, createShapeId, Editor } from "tldraw";
import "tldraw/tldraw.css";

const TLDRAW_LICENSE = "tldraw-2026-06-22/WyJVc3NwazFPQiIsWyIqIl0sMTYsIjIwMjYtMDYtMjIiXQ.F/7993pPgWC+etoylsfs4uwen7ECd5ozjOXeGutxjO9A8gfDfYMbKl3FtOBEM/6U6Ej79sgSX24bYzl51WDaXw";

interface GameCanvasProps {
  onDrop?: (files: File[], position: { x: number; y: number }) => void;
}

export default function GameCanvas({ onDrop }: GameCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
    editor.user.updateUserPreferences({ colorScheme: "dark" });
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDropEvent = async (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer?.files.length || !editor) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const point = editor.screenToPage({ x: e.clientX, y: e.clientY });

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const asset = await editor.getAssetForExternalContent({
          type: "file",
          file,
        });
        if (!asset) continue;

        editor.createAssets([asset]);
        editor.createShape({
          id: createShapeId(),
          type: "image",
          x: point.x + i * 220,
          y: point.y,
          props: { assetId: asset.id, w: 200, h: 150 },
        });
      }

      onDrop?.(imageFiles, { x: point.x, y: point.y });
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDropEvent);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDropEvent);
    };
  }, [editor, onDrop]);

  return (
    <div className="w-full h-full game-canvas">
      <style jsx global>{`
        .game-canvas .tlui-style-panel__wrapper {
          display: none !important;
        }
      `}</style>
      <Tldraw licenseKey={TLDRAW_LICENSE} onMount={handleMount} />
    </div>
  );
}
