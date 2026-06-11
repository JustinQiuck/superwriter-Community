import { createClient } from "@/lib/supabase/server";
import { generateText, type LanguageModel } from "ai";
import { getModel } from "@/lib/ai/providers";
import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import { embedText } from "@/lib/ai/embedding";
import { addRecallMemory } from "@/lib/db/queries/memories";

const DEFAULT_THRESHOLD = 500;
const SUMMARIZE_MAX_LENGTH = 2000;
const SUMMARY_TARGET_LENGTH = 200;

interface CompressionConfig {
  threshold: number;
  strategy: "conservative" | "standard" | "aggressive";
}

const STRATEGY_DAYS: Record<CompressionConfig["strategy"], number> = {
  conservative: 60,
  standard: 30,
  aggressive: 14,
};

export async function checkAndCompressMemory(
  storyId: string,
  config?: Partial<CompressionConfig>,
): Promise<{ compressed: number }> {
  const threshold = config?.threshold ?? DEFAULT_THRESHOLD;
  const strategy = config?.strategy ?? "standard";

  const supabase = await createClient();

  const { count } = await supabase
    .from("story_archival_memories")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);

  if (!count || count < threshold) {
    return { compressed: 0 };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - STRATEGY_DAYS[strategy]);

  const { data: candidates } = await supabase
    .from("story_archival_memories")
    .select("id, source_type, source_id, content, segment_index, metadata, created_at")
    .eq("story_id", storyId)
    .lt("created_at", cutoffDate.toISOString())
    .order("created_at", { ascending: true })
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return { compressed: 0 };
  }

  let compressed = 0;

  for (const item of candidates) {
    try {
      let compressedContent = item.content;

      if (item.content.length > SUMMARIZE_MAX_LENGTH) {
        const resolvedRoute = await resolveAIModelRoute({
          routeKey: "memory_compression",
          plan: null,
          capability: "analysis",
          callScope: "internal_system",
        });
        const model = getModel(resolvedRoute);
        const { text: summary } = await generateText({
          model: model as LanguageModel,
          prompt: `请将以下小说内容压缩为${SUMMARY_TARGET_LENGTH}字以内的摘要，保留关键情节和设定信息：\n\n${item.content.slice(0, 4000)}`,
        });
        compressedContent = summary;
      }

      const newEmbedding = await embedText(compressedContent);

      await supabase.from("story_archival_memories_cold").insert({
        story_id: storyId,
        original_id: item.id,
        source_type: item.source_type,
        source_id: item.source_id,
        segment_index: item.segment_index,
        original_content: item.content,
        compressed_content: compressedContent,
        content_embedding: newEmbedding,
        metadata: item.metadata,
      });

      await supabase
        .from("story_archival_memories")
        .delete()
        .eq("id", item.id);

      compressed++;
    } catch {
      break;
    }
  }

  if (compressed > 0) {
    await addRecallMemory(storyId, "ai_interaction", `记忆压缩完成：${compressed}条记录已归档`, {
      compressedCount: compressed,
      strategy,
    }).catch(() => {});
  }

  return { compressed };
}
