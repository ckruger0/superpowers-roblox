import { getMcpStatus, connectMcp } from "@/lib/mcp-client";

export async function GET() {
  let status = await getMcpStatus();

  // Try to connect if not connected
  if (!status.connected) {
    status = await connectMcp();
  }

  return Response.json(status);
}
