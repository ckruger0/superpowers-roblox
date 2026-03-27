import { callMcpTool, getMcpStatus } from "@/lib/mcp-client";

export async function GET() {
  const status = await getMcpStatus();
  if (!status.connected) {
    return Response.json({ spaces: [], error: "Not connected" });
  }

  try {
    // Query the game tree root to get the place name
    const result = await callMcpTool("search_game_tree", {
      query: "*",
      path: "game",
      depth: 1,
    });

    // Try to extract place info from the result
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);

    return Response.json({ spaces: [{ name: resultStr || "Roblox Studio", id: "default" }] });
  } catch (error) {
    // If the tool call fails, just return a generic entry
    return Response.json({
      spaces: [{ name: "Roblox Studio", id: "default" }],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
