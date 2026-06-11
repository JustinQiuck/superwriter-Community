"use client";

import { BubbleMenu, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AICreditBadge } from "@/components/ai/ai-credit-badge";
import { formatAIErrorForToast, normalizeAIError } from "@/lib/ai/ai-errors";
import {
  buildWritingIntentPrompt,
  FLOATING_WRITING_INTENTS,
} from "@/lib/ai/writing-intents";
import type { WritingIntent } from "@/lib/ai/writing-intents";
import { Loader2, X } from "lucide-react";
import { useFocusPayload } from "@/stores/writing-focus-store";
import { useAICreditPreview } from "@/hooks/use-ai-credit-preview";
import type { AIEditorDraft, EditorSelectionSnapshot } from "@/types/ai";
import { toast } from "sonner";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import { cn } from "@/lib/utils";

interface AIFloatingMenuProps {
  editor: Editor;
  storyId: string;
  chapterId?: string;
  aiProvider?: string;
  aiModel?: string;
  onDraftGenerated?: (draft: AIEditorDraft) => void;
}

function getEditorCursorContext(editor: Editor) {
  const { from } = editor.state.selection;
  const doc = editor.state.doc;
  const $from = editor.state.selection.$from;
  const paragraphFrom = $from.start();
  const paragraphTo = $from.end();
  const currentParagraphText = doc.textBetween(paragraphFrom, paragraphTo, "\n");
  const currentParagraph = currentParagraphText.trim();
  const isAtParagraphBoundary =
    $from.parentOffset === 0 || $from.parentOffset === $from.parent.content.size;
  const paragraphBounds = {
    from: paragraphFrom,
    to: paragraphTo,
    text: currentParagraphText,
  };
  const before = doc
    .textBetween(Math.max(0, from - 800), from, "\n")
    .trim();
  const after = doc
    .textBetween(from, Math.min(doc.content.size, from + 800), "\n")
    .trim();

  return {
    currentParagraph,
    paragraphBounds,
    before,
    after,
    isAtParagraphBoundary,
  };
}

function shouldSelectParagraphForCursorDraft(intent: WritingIntent): boolean {
  return [
    "chapter_rewrite",
    "conflict_intensify",
    "pacing_tighten",
  ].includes(intent.mode);
}

export function AIFloatingMenu({
  editor,
  storyId,
  chapterId,
  aiProvider = "anthropic",
  aiModel,
  onDraftGenerated,
}: AIFloatingMenuProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const focusPayload = useFocusPayload();
  const creditPreviewItems = useMemo(
    () => FLOATING_WRITING_INTENTS.map((intent) => ({
      clientKey: `floating:${intent.mode}`,
      routeKey: intent.mode,
      hasEnhancedContext: Boolean(focusPayload),
    })),
    [focusPayload],
  );
  const { previews, loading: creditPreviewLoading } = useAICreditPreview(creditPreviewItems);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const runAIAction = async (intent: WritingIntent) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    const editorCursorContext = getEditorCursorContext(editor);
    const hasSelection = from !== to && Boolean(selectedText.trim());
    const sourceText =
      selectedText.trim() ||
      editorCursorContext.currentParagraph ||
      focusPayload?.cursorContext?.currentParagraph?.trim() ||
      editorCursorContext.before ||
      focusPayload?.cursorContext?.before?.trim() ||
      "";
    const prompt = buildWritingIntentPrompt(intent, sourceText);
    if (!prompt.trim()) {
      toast.error("请先在正文中放置光标，或选择一段需要处理的文本");
      return;
    }

    const requestFocusPayload = {
      storyId,
      chapterId: chapterId ?? null,
      beatId: null,
      cursorContext: {
        before: editorCursorContext.before,
        after: editorCursorContext.after,
        currentParagraph: editorCursorContext.currentParagraph,
      },
    };

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(intent.mode);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: intent.mode,
          storyId,
          prompt,
          provider: aiProvider,
          model: aiModel,
          focusPayload: requestFocusPayload,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        toast.error(formatAIErrorForToast(normalizeAIError({
          status: res.status,
          body,
        })));
        return;
      }

      const result = await readTextFromDataStream(res.body);

      if (!result.trim()) return;
      const selection: EditorSelectionSnapshot | undefined = hasSelection
        ? { from, to, text: selectedText }
        : shouldSelectParagraphForCursorDraft(intent) &&
            editorCursorContext.currentParagraph
          ? editorCursorContext.paragraphBounds
          : undefined;

      onDraftGenerated?.({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${intent.mode}`,
        storyId,
        chapterId,
        mode: intent.mode,
        sourceText: selectedText.trim() ? selectedText : sourceText || prompt,
        resultText: result,
        selection,
        createdAt: new Date().toISOString(),
      });
      toast.success("AI 草稿已生成，已放入右侧候选区");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(formatAIErrorForToast(normalizeAIError(error)));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(null);
    }
  };

  const cancelAIAction = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: "top" }}
      shouldShow={({ editor }) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, "\n");
        if (from !== to && selectedText.trim()) return true;

        const { currentParagraph, isAtParagraphBoundary } =
          getEditorCursorContext(editor);
        return editor.isFocused && Boolean(currentParagraph) && isAtParagraphBoundary;
      }}
    >
      <div
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "studio-glass studio-command-pill flex items-center gap-1 p-1",
          loading && "liquid-ai-glow",
        )}
      >
        {FLOATING_WRITING_INTENTS.map((intent) => (
          <Button
            key={intent.id}
            size="sm"
            variant="ghost"
	            className="h-8 gap-1 rounded-full px-3 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
	            onClick={() => runAIAction(intent)}
	            disabled={loading !== null || previews[`floating:${intent.mode}`]?.isDisabled}
	            title={intent.description}
	            onMouseDown={(event) => event.preventDefault()}
	          >
            {loading === intent.mode ? (
	              <Loader2 className="h-3 w-3 animate-spin" />
	            ) : null}
	            {intent.shortLabel}
	            <AICreditBadge
	              preview={previews[`floating:${intent.mode}`]}
	              loading={creditPreviewLoading}
	            />
	          </Button>
        ))}
        {loading ? (
          <Button
            size="sm"
            variant="ghost"
            className="studio-command-button h-8 w-8 rounded-full border-0 p-0 text-xs shadow-none"
            onClick={cancelAIAction}
            title="取消生成"
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </BubbleMenu>
  );
}
