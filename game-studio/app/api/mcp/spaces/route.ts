import { callMcpTool, connectMcp } from "@/lib/mcp-client";

export async function GET() {
  // Ensure we're connected (don't rely on prior status check)
  const status = await connectMcp();
  if (!status.connected) {
    return Response.json({ spaces: [], error: status.error || "Not connected" });
  }

  try {
    const result = await callMcpTool("execute_luau", {
      code: `return game.Name .. " (PlaceId: " .. tostring(game.PlaceId) .. ")"`,
    });

    // The MCP SDK returns { content: [{ type: "text", text: "..." }] }
    let placeName = "Roblox Studio";
    if (result && typeof result === "object") {
      // Try nested content array
      const r = result as Record<string, unknown>;
      const content = r.content as Array<{ text?: string }> | undefined;
      if (content?.[0]?.text) {
        placeName = content[0].text;
      } else {
        // Try stringifying and extracting
        const str = JSON.stringify(result);
        // Look for the actual return value in the response
        const match = str.match(/"text"\s*:\s*"([^"]+)"/);
        if (match) {
          placeName = match[1];
        }
      }
    } else if (typeof result === "string") {
      placeName = result;
    }

    return Response.json({ spaces: [{ name: placeName, id: "default" }] });
  } catch (error) {
    return Response.json({
      spaces: [],
      error: error instanceof Error ? error.message : "Failed to get place info",
    });
  }
}
