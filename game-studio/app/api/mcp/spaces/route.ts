import { callMcpTool, getMcpStatus } from "@/lib/mcp-client";

export async function GET() {
  const status = await getMcpStatus();
  if (!status.connected) {
    return Response.json({ spaces: [], error: "Not connected" });
  }

  try {
    const result = await callMcpTool("execute_luau", {
      code: `return game.Name .. " (PlaceId: " .. tostring(game.PlaceId) .. ")"`,
    });

    // Extract the text from the MCP result
    let placeName = "Roblox Studio";
    if (result && typeof result === "object") {
      const r = result as { content?: Array<{ text?: string }> };
      if (r.content?.[0]?.text) {
        placeName = r.content[0].text;
      }
    } else if (typeof result === "string") {
      placeName = result;
    }

    return Response.json({ spaces: [{ name: placeName, id: "default" }] });
  } catch {
    return Response.json({
      spaces: [{ name: "Roblox Studio", id: "default" }],
    });
  }
}
