"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AICreditBadge } from "@/components/ai/ai-credit-badge";
import { useAICreditPreview } from "@/hooks/use-ai-credit-preview";
import { Loader2, Sparkles } from "lucide-react";

interface SourceInputPanelProps {
  sourceTitle: string;
  text: string;
  loading?: boolean;
  onSourceTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onAnalyze: () => void;
}

const MAX_SOURCE_LENGTH = 60_000;
const CREDIT_ITEMS = [{ clientKey: "work-learning:analyze", routeKey: "work_learning_analyze" }];

export function SourceInputPanel({
  sourceTitle,
  text,
  loading = false,
  onSourceTitleChange,
  onTextChange,
	onAnalyze,
}: SourceInputPanelProps) {
  const { previews, loading: creditPreviewLoading } = useAICreditPreview(CREDIT_ITEMS);
  const preview = previews["work-learning:analyze"];
  const canSubmit =
    text.trim().length > 0 &&
    text.length <= MAX_SOURCE_LENGTH &&
    !loading &&
    !preview?.isDisabled;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">参考文本</h2>
        <p className="text-sm text-muted-foreground">MVP 只支持粘贴文本，原文不会默认保存。</p>
      </div>
      <Input
        value={sourceTitle}
        onChange={(event) => onSourceTitleChange(event.target.value)}
        placeholder="来源标题，可选"
        className="h-10 rounded-lg bg-workspace-paper/80"
      />
      <Textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="粘贴一章、一个片段，或一段你想学习的参考文本..."
        className="min-h-[280px] resize-y rounded-lg bg-workspace-paper/80 leading-6"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {text.length}/{MAX_SOURCE_LENGTH}
        </span>
        <Button
          type="button"
          className="gap-2 rounded-lg"
          disabled={!canSubmit}
          onClick={onAnalyze}
        >
	          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
	          开始拆解
	          <AICreditBadge
	            preview={preview}
	            loading={creditPreviewLoading}
	          />
	        </Button>
      </div>
    </section>
  );
}
