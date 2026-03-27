import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

// Store a base64 image and return a URL
export async function POST(request: NextRequest) {
  const { imageData, mimeType } = await request.json();

  if (!imageData) {
    return Response.json({ error: "No image data" }, { status: 400 });
  }

  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const ext = mimeType?.includes("png") ? "png" : "jpg";
  const filename = `screenshot-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  const buffer = Buffer.from(imageData, "base64");
  await writeFile(filepath, buffer);

  return Response.json({ url: `/screenshots/${filename}` });
}
