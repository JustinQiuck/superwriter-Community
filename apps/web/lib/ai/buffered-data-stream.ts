import {
  createDataStreamResponse,
  formatDataStreamPart,
  type LanguageModelUsage,
} from "ai";
import type { ResolvedAIModelRoute } from "@/lib/ai/model-registry";

export function shouldUseBufferedChannelResponse(
  route: Pick<ResolvedAIModelRoute, "adapterType" | "channelId">,
) {
  return route.adapterType === "openai_compatible" && Boolean(route.channelId);
}

export function createBufferedTextDataStreamResponse({
  text,
  usage,
  getErrorMessage,
}: {
  text: string;
  usage?: LanguageModelUsage;
  getErrorMessage: (error: unknown) => string;
}) {
  return createDataStreamResponse({
    execute(dataStream) {
      if (text) {
        dataStream.write(formatDataStreamPart("text", text));
      }
      dataStream.write(formatDataStreamPart("finish_message", {
        finishReason: "stop",
        usage: {
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
        },
      }));
    },
    onError: getErrorMessage,
  });
}
