import { NextRequest } from "next/server";
import { loadSkillAsSystemPrompt } from "@/lib/skill-loader";
import { streamConversation } from "@/lib/anthropic";
import { loadGDD } from "@/lib/gdd";

export async function POST(request: NextRequest) {
  const { messages, skill = "new-game" } = await request.json();

  let systemPrompt: string;

  if (skill === "__raw__") {
    // Canvas mode: system prompt is baked into the message from the frontend
    systemPrompt = "You are an AI game design assistant. Respond with valid JSON as instructed.";
  } else {
    // Skill mode: load from skill files
    const gdd = await loadGDD();
    const gddContext =
      gdd.vision.content || gdd.mechanics.content
        ? `Title: ${gdd.title}\nVision: ${gdd.vision.content}\nMechanics: ${gdd.mechanics.content}\nNarrative: ${gdd.narrative.content}\nLevel Plan: ${gdd.levelPlan.content}`
        : undefined;

    try {
      systemPrompt = await loadSkillAsSystemPrompt(skill, gddContext);
    } catch {
      systemPrompt = "You are a creative game design assistant for Roblox.";
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      await streamConversation(systemPrompt, messages, {
        onText: (text) => send("text", { text }),
        onToolCall: (name, input) => send("tool_call", { name, input }),
        onToolResult: (name, result) => send("tool_result", { name, result }),
        onDone: (fullResponse) => {
          send("done", { fullResponse });
          controller.close();
        },
        onError: (error) => {
          send("error", { message: error.message });
          controller.close();
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
