import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpStatus } from "./types";

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

const MCP_BINARY = process.env.MCP_BINARY_PATH ?? "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP";

export async function connectMcp(): Promise<McpStatus> {
  if (client) {
    return { connected: true };
  }

  try {
    transport = new StdioClientTransport({
      command: MCP_BINARY,
    });

    client = new Client(
      { name: "game-studio", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    return { connected: true };
  } catch (error) {
    client = null;
    transport = null;
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function disconnectMcp(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    transport = null;
  }
}

export async function getMcpStatus(): Promise<McpStatus> {
  if (!client) {
    return { connected: false };
  }
  return { connected: true };
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!client) {
    const status = await connectMcp();
    if (!status.connected) {
      throw new Error(`MCP not connected: ${status.error}`);
    }
  }

  const result = await client!.callTool({ name, arguments: args });
  return result;
}

export async function listMcpTools(): Promise<
  Array<{ name: string; description?: string; inputSchema: unknown }>
> {
  if (!client) {
    await connectMcp();
  }

  const result = await client!.listTools();
  return result.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}
