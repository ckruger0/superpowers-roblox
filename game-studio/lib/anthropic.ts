import Anthropic from "@anthropic-ai/sdk";
import { callMcpTool, listMcpTools } from "./mcp-client";

const anthropic = new Anthropic();

interface ConversationMessage {
  role: "user" | "assistant";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (name: string, input: Record<string, unknown>) => void;
  onToolResult: (name: string, result: unknown) => void;
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

  // Conversation loop — keeps going until Claude stops calling tools
  while (true) {
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

        // For screen_capture, extract the image and send it separately
        // Don't send the full base64 through the tool_result SSE event
        const resultStr = JSON.stringify(result);
        if (toolUse.name === "screen_capture") {
          const imageMatch = resultStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
          callbacks.onToolResult(toolUse.name, {
            hasImage: true,
            imageUrl: imageMatch?.[0] ?? null,
          });
        } else {
          // Truncate large results for the SSE stream
          const preview = resultStr.length > 2000
            ? resultStr.slice(0, 2000) + "...(truncated)"
            : result;
          callbacks.onToolResult(toolUse.name, preview);
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultStr,
        });
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
