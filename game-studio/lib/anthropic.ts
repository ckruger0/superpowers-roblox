import Anthropic from "@anthropic-ai/sdk";
import { callMcpTool, listMcpTools } from "./mcp-client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const anthropic = new Anthropic();

async function saveScreenshot(base64Data: string, mimeType: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "screenshots");
  await mkdir(dir, { recursive: true });
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filename = `screenshot-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(base64Data, "base64"));
  return `/screenshots/${filename}`;
}

interface ConversationMessage {
  role: "user" | "assistant";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (name: string, input: Record<string, unknown>) => void;
  onToolResult: (name: string, result: unknown) => void;
  onNewMessage: () => void; // Called when Claude starts a new text response (after tool calls)
  onDone: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export async function getMcpToolDefinitions(): Promise<Anthropic.Tool[]> {
  const mcpTools = await listMcpTools();
  return mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

export async function streamConversation(
  systemPrompt: string,
  messages: ConversationMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  let tools: Anthropic.Tool[];
  try {
    tools = await getMcpToolDefinitions();
  } catch {
    tools = [];
  }

  let currentMessages = [...messages];
  let fullResponse = "";
  let isFirstIteration = true;

  // Conversation loop — keeps going until Claude stops calling tools
  while (true) {
    // Signal new message bubble for each iteration after the first
    if (!isFirstIteration) {
      callbacks.onNewMessage();
    }
    isFirstIteration = false;
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: currentMessages as Anthropic.MessageParam[],
      tools: tools.length > 0 ? tools : undefined,
    });

    let hasToolUse = false;
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    let textAccumulator = "";

    try {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          textAccumulator += event.delta.text;
          fullResponse += event.delta.text;
          callbacks.onText(event.delta.text);
        }

        if (
          event.type === "content_block_stop" &&
          stream.currentMessage
        ) {
          const block =
            stream.currentMessage.content[
              stream.currentMessage.content.length - 1
            ];
          if (block && block.type === "tool_use") {
            hasToolUse = true;
            toolUseBlocks.push(block);
          }
        }
      }
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
      return;
    }

    if (!hasToolUse) {
      callbacks.onDone(fullResponse);
      return;
    }

    // Build assistant message with all content blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assistantContent: any[] = [];
    if (textAccumulator) {
      assistantContent.push({ type: "text", text: textAccumulator, citations: null });
    }
    for (const toolUse of toolUseBlocks) {
      assistantContent.push(toolUse);
    }

    currentMessages.push({
      role: "assistant",
      content: assistantContent,
    });

    // Execute all tool calls and collect results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = [];
    for (const toolUse of toolUseBlocks) {
      callbacks.onToolCall(
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );

      try {
        const result = await callMcpTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        const resultStr = JSON.stringify(result);
        console.log(`[MCP] Tool ${toolUse.name} result length: ${resultStr.length}`);

        if (toolUse.name === "screen_capture") {
          // MCP returns ImageContent: { content: [{ type: "image", data: "<base64>", mimeType: "image/jpeg" }] }
          // Or it might be nested differently. Let's try multiple extraction strategies.
          let imageUrl: string | null = null;

          // Strategy 1: MCP ImageContent block — { type: "image", data: "...", mimeType: "..." }
          const r = result as Record<string, unknown>;
          const content = r?.content as Array<Record<string, unknown>> | undefined;
          if (content) {
            for (const block of content) {
              if (block.type === "image" && typeof block.data === "string") {
                const mimeType = (block.mimeType as string) || "image/jpeg";
                imageUrl = `data:${mimeType};base64,${block.data}`;
                console.log(`[MCP] screen_capture: extracted ImageContent block (${mimeType}, ${block.data.length} chars)`);
                break;
              }
              // Also check for text blocks that contain base64
              if (block.type === "text" && typeof block.text === "string") {
                const match = block.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
                if (match) {
                  imageUrl = match[0];
                  console.log(`[MCP] screen_capture: extracted from text block (${imageUrl.length} chars)`);
                  break;
                }
              }
            }
          }

          // Strategy 2: raw data:image URL somewhere in the JSON
          if (!imageUrl) {
            const match = resultStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
            if (match) {
              imageUrl = match[0];
              console.log(`[MCP] screen_capture: extracted via regex (${imageUrl.length} chars)`);
            }
          }

          // Strategy 3: raw base64 in a "data" field
          if (!imageUrl) {
            const dataMatch = resultStr.match(/"data"\s*:\s*"([A-Za-z0-9+/=]{100,})"/);
            if (dataMatch) {
              imageUrl = `data:image/jpeg;base64,${dataMatch[1]}`;
              console.log(`[MCP] screen_capture: extracted raw data field (${dataMatch[1].length} chars)`);
            }
          }

          if (!imageUrl) {
            console.log(`[MCP] screen_capture: NO IMAGE FOUND. Result preview: ${resultStr.slice(0, 500)}`);
          }

          // Save to disk and send a URL instead of massive base64 through SSE
          let screenshotUrl: string | null = null;
          if (imageUrl) {
            try {
              // Extract raw base64 from data URL
              const b64Match = imageUrl.match(/;base64,(.+)$/);
              const mimeMatch = imageUrl.match(/^data:([^;]+)/);
              if (b64Match && mimeMatch) {
                screenshotUrl = await saveScreenshot(b64Match[1], mimeMatch[1]);
                console.log(`[MCP] screen_capture: saved to ${screenshotUrl}`);
              }
            } catch (err) {
              console.error(`[MCP] screen_capture: failed to save`, err);
            }
          }

          callbacks.onToolResult(toolUse.name, {
            hasImage: !!screenshotUrl,
            imageUrl: screenshotUrl,
          });

          // Send the image back to Claude as a vision block so it can SEE what was captured
          const b64Match = imageUrl?.match(/;base64,(.+)$/);
          const mimeMatch = imageUrl?.match(/^data:([^;]+)/);
          if (b64Match && mimeMatch) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeMatch[1],
                    data: b64Match[1],
                  },
                },
                {
                  type: "text",
                  text: "Screenshot captured. Look at this image carefully. Evaluate what you see against the game design — what looks good, what needs to change? Then continue building or ask the user for feedback.",
                },
              ],
            });
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: "Screenshot captured but image data could not be extracted.",
            });
          }
        } else {
          const preview = resultStr.length > 2000
            ? resultStr.slice(0, 2000) + "...(truncated)"
            : result;
          callbacks.onToolResult(toolUse.name, preview);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: resultStr.length > 100000
              ? resultStr.slice(0, 100000) + "...(truncated for Claude)"
              : resultStr,
          });
        }
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${errMsg}`,
          is_error: true,
        });
      }
    }

    currentMessages.push({
      role: "user",
      content: toolResults,
    });

    // Reset for next loop iteration
    textAccumulator = "";
  }
}
