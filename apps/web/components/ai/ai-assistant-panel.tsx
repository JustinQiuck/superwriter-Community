"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WritingTargetCard } from "@/components/editor/writing-target-card";
import { AIDraftCandidates } from "@/components/editor/ai-draft-candidates";
import { AICreditBadge } from "@/components/ai/ai-credit-badge";
import { ConsistencyFindingsPanel } from "@/components/ai/consistency-findings-panel";
import { MemoryInboxPanel } from "@/components/ai/memory-inbox-panel";
import { formatAIErrorForToast, normalizeAIError } from "@/lib/ai/ai-errors";
import {
  buildChapterCompletionInput,
  normalizeChapterCompletionText,
} from "@/lib/writing/chapter-completion";
import {
  buildWritingIntentPrompt,
  isAdvisoryWritingIntent,
  isInsertionWritingIntent,
  WRITING_INTENT_GROUPS,
} from "@/lib/ai/writing-intents";
import { useFocusPayload } from "@/stores/writing-focus-store";
import { useAICreditPreview } from "@/hooks/use-ai-credit-preview";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import type { WritingBrief } from "@/lib/writing/daily-writing-brief";
import type { WritingIntent } from "@/lib/ai/writing-intents";
import {
  Send,
  Loader2,
  Sparkles,
  Plus,
  Replace,
  CornerDownRight,
  X,
  RefreshCw,
  FileText,
  ListTree,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Clipboard,
} from "lucide-react";
import type { AIMode, AIProvider } from "@superwriter/shared";
import type { AIApplyMode, AIEditorDraft } from "@/types/ai";
import type { ConsistencyFinding } from "@/types/consistency";
import { toast } from "sonner";

interface AIAssistantPanelProps {
  storyId: string;
  aiProvider?: string;
  aiBillingProvider?: AIProvider;
  aiModel?: string;
  draft?: AIEditorDraft | null;
  currentChapterId?: string | null;
  currentChapterName?: string;
  currentChapterText?: string;
  writingBrief?: WritingBrief | null;
  writingBriefLoading?: boolean;
  draftCandidates?: AIEditorDraft[];
  applyingDraftId?: string | null;
  onSelectDraft?: (draft: AIEditorDraft) => void;
  onApplyDraft?: (mode: AIApplyMode, draft: AIEditorDraft) => void;
  onCopyDraft?: (draft: AIEditorDraft) => void;
  onDiscardDraft?: (draft: AIEditorDraft) => void;
  onMarkDraftReference?: (draft: AIEditorDraft) => void;
  onDraftGenerated?: (draft: AIEditorDraft) => void;
  onDraftUpdated?: (draft: AIEditorDraft) => void;
  onClearDraft?: () => void;
}

const MODE_LABELS: Partial<Record<AIMode, string>> = {
  chapter_rewrite: "润色改写",
  sensory_expand: "感官扩写",
  character_dialogue: "生成对话",
  chapter_continue: "续写",
  conflict_intensify: "加强冲突",
  pacing_tighten: "压缩拖沓",
  hook_boost: "补钩子",
  voice_check: "口吻检查",
  chapter_drift_check: "跑偏检查",
  chapter_completion_review: "完章检查",
  foreshadowing_check: "伏笔检查",
  consistency_check: "一致性检查",
};

const AI_GENERATE_TIMEOUT_MS = 60_000;

type AIGenerationHistoryRow = {
  id: string;
  prompt: string;
  result: string | null;
  created_at: string | null;
};

function isAdvisoryChatReply(userMessage: string, assistantMessage: string): boolean {
  const combined = `${userMessage}\n${assistantMessage}`.toLowerCase();
  return [
    "建议",
    "检查",
    "够强",
    "是否",
    "判断",
    "怎么推进",
    "风险",
    "问题",
    "推荐节奏",
  ].some((keyword) => combined.includes(keyword));
}

function createGenerateTimeout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);
  return {
    controller,
    signal: controller.signal,
    clear: () => window.clearTimeout(timeout),
  };
}

function showGenerateError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    toast.error("AI 生成超时，请稍后重试或切换模型。");
    return;
  }
  toast.error(formatAIErrorForToast(normalizeAIError(error)));
}

export function AIAssistantPanel({
  storyId,
  aiProvider = "anthropic",
  aiModel,
  draft,
  currentChapterId,
  currentChapterName,
  currentChapterText = "",
  writingBrief,
  writingBriefLoading = false,
  draftCandidates = [],
  applyingDraftId,
  onSelectDraft,
  onApplyDraft,
  onCopyDraft,
  onDiscardDraft,
  onMarkDraftReference,
  onDraftGenerated,
  onDraftUpdated,
  onClearDraft,
}: AIAssistantPanelProps) {
  const [input, setInput] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [completionReviewing, setCompletionReviewing] = useState(false);
  const [rememberingDraftId, setRememberingDraftId] = useState<string | null>(null);
  const [consistencyFindings, setConsistencyFindings] = useState<ConsistencyFinding[]>([]);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [memoryInbox, setMemoryInbox] = useState<ConsistencyFinding[]>([]);
  const [memoryInboxLoading, setMemoryInboxLoading] = useState(false);
  const [memoryInboxActingId, setMemoryInboxActingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [draftPreviewExpanded, setDraftPreviewExpanded] = useState(false);
  const aiContentEndRef = useRef<HTMLDivElement>(null);
  const regenerateAbortRef = useRef<AbortController | null>(null);
  const rememberingDraftIdRef = useRef<string | null>(null);
  const hydratedStoryRef = useRef<string | null>(null);
  const messageCountRef = useRef(0);
  const focusPayload = useFocusPayload();
  const normalizedCurrentChapterText = useMemo(
    () => normalizeChapterCompletionText(currentChapterText),
    [currentChapterText],
  );
  const currentSceneCard = writingBrief?.currentSceneCard ?? null;
  const isDraftPreviewLong = draft
    ? draft.resultText.length > 260 || draft.resultText.split("\n").length > 8
    : false;
  const showFullDraftPreview = regenerating || !isDraftPreviewLong || draftPreviewExpanded;
  const isApplyingDraft = Boolean(applyingDraftId);
  const draftGenerationId = draft?.generationId ?? null;
  const requestBody = {
    provider: aiProvider,
    model: aiModel,
    storyId,
    focusPayload,
  };
  const creditPreviewItems = useMemo(() => {
    const items = new Map<string, { clientKey: string; routeKey: string; hasEnhancedContext?: boolean }>();
    const add = (clientKey: string, routeKey: string, hasEnhancedContext = Boolean(focusPayload)) => {
      items.set(clientKey, { clientKey, routeKey, hasEnhancedContext });
    };

    add("chat:send", "free_chat");
    add("completion:chapter_completion_review", "chapter_completion_review");
    if (draft?.mode) add(`draft:${draft.mode}`, draft.mode);
    WRITING_INTENT_GROUPS.forEach((group) => {
      group.intents.forEach((intent) => add(`intent:${intent.mode}`, intent.mode));
    });
    return Array.from(items.values());
  }, [draft?.mode, focusPayload]);
  const { previews, loading: creditPreviewLoading } = useAICreditPreview(creditPreviewItems);
  const isCreditPreviewDisabled = (clientKey: string) => previews[clientKey]?.isDisabled === true;

  const loadConsistencyFindings = useCallback(async () => {
    if (!draftGenerationId) {
      setConsistencyFindings([]);
      setConsistencyLoading(false);
      return;
    }

    setConsistencyLoading(true);
    try {
      const params = new URLSearchParams({
        sourceType: "ai_generation",
        sourceId: draftGenerationId,
        limit: "20",
      });
      const response = await fetch(`/api/stories/${storyId}/consistency/findings?${params.toString()}`);
      const body = response.ok ? await response.json() : null;
      setConsistencyFindings(Array.isArray(body?.data) ? body.data : []);
    } catch {
      setConsistencyFindings([]);
    } finally {
      setConsistencyLoading(false);
    }
  }, [draftGenerationId, storyId]);

  const loadMemoryInbox = useCallback(async () => {
    setMemoryInboxLoading(true);
    try {
      const response = await fetch(`/api/stories/${storyId}/consistency/inbox?limit=20`);
      const body = response.ok ? await response.json() : null;
      setMemoryInbox(Array.isArray(body?.data) ? body.data : []);
    } catch {
      setMemoryInbox([]);
    } finally {
      setMemoryInboxLoading(false);
    }
  }, [storyId]);

  const { messages, isLoading, append, setMessages } = useChat({
    api: "/api/ai/chat",
    body: requestBody,
    onError(error) {
      toast.error(formatAIErrorForToast(normalizeAIError(error)));
    },
  });

  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;
    hydratedStoryRef.current = storyId;

    fetch(`/api/stories/${storyId}/ai-generations?mode=free_chat&limit=20`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || hydratedStoryRef.current !== storyId) return;
        const rows = Array.isArray(body?.data) ? body.data as AIGenerationHistoryRow[] : [];
        const historyMessages = rows.flatMap((row) => {
          if (!row.prompt.trim() || !row.result?.trim()) return [];
          return [
            {
              id: `${row.id}-user`,
              role: "user" as const,
              content: row.prompt,
              createdAt: row.created_at ? new Date(row.created_at) : undefined,
            },
            {
              id: `${row.id}-assistant`,
              role: "assistant" as const,
              content: row.result,
              createdAt: row.created_at ? new Date(row.created_at) : undefined,
            },
          ];
        });
        if (historyMessages.length > 0 && messageCountRef.current === 0) {
          setMessages(historyMessages);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setMessages, storyId]);

  useEffect(() => {
    if (activeTab === "ai") {
      aiContentEndRef.current?.scrollIntoView?.({ block: "end" });
    }
  }, [activeTab, draft?.id, draftCandidates.length, isLoading, messages]);

  useEffect(() => {
    void loadConsistencyFindings();
  }, [loadConsistencyFindings]);

  useEffect(() => {
    void loadMemoryInbox();
  }, [loadMemoryInbox]);

  useEffect(() => {
    return () => regenerateAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    setDraftPreviewExpanded(false);
  }, [draft?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isCreditPreviewDisabled("chat:send")) return;
    const nextInput = input.trim();
    messageCountRef.current = Math.max(messageCountRef.current, 1);
    append({ role: "user", content: nextInput }, { body: requestBody });
    setInput("");
  };

  const getPreviousUserMessage = (messageIndex: number) => {
    for (let index = messageIndex - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "user" && typeof message.content === "string") {
        return message.content;
      }
    }
    return "自由聊天";
  };

  const createDraftFromAssistantMessage = (message: { id: string; content: string }, messageIndex: number): AIEditorDraft => ({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${message.id}`,
    storyId,
    chapterId: currentChapterId ?? null,
    mode: "free_chat",
    sourceText: getPreviousUserMessage(messageIndex),
    resultText: message.content,
    createdAt: new Date().toISOString(),
  });

  const insertAssistantMessage = (message: { id: string; content: string }, messageIndex: number) => {
    if (isApplyingDraft) return;
    if (!onApplyDraft) return;
    const nextDraft = createDraftFromAssistantMessage(message, messageIndex);
    onDraftGenerated?.(nextDraft);
    onApplyDraft("insert", nextDraft);
  };

  const saveAssistantMessageAsReference = (message: { id: string; content: string }, messageIndex: number) => {
    const nextDraft = createDraftFromAssistantMessage(message, messageIndex);
    onDraftGenerated?.(nextDraft);
    toast.success("已保存为参考");
  };

  const copyAssistantMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制 AI 回复");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleQuickAction = async (intent: WritingIntent) => {
    const contextText =
      focusPayload?.cursorContext?.currentParagraph?.trim() ||
      focusPayload?.cursorContext?.before?.trim() ||
      "";
    const prompt = buildWritingIntentPrompt(intent, contextText);

    if (!prompt.trim() || regenerating || isCreditPreviewDisabled(`intent:${intent.mode}`)) return;

    setActiveTab("ai");
    setRegenerating(true);
    const timeout = createGenerateTimeout();

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeout.signal,
        body: JSON.stringify({
          mode: intent.mode,
          storyId,
          prompt,
          provider: aiProvider,
          model: aiModel,
          focusPayload,
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

      const resultText = await readTextFromDataStream(res.body);
      if (!resultText.trim()) {
        toast.error("AI 没有返回可用内容");
        return;
      }

      if (isAdvisoryWritingIntent(intent) || !isInsertionWritingIntent(intent)) {
        setMessages((items) => [
          ...items,
          {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${intent.id}-result`,
            role: "assistant",
            content: `「${intent.shortLabel}」结果：\n\n${resultText}`,
          },
        ]);
        return;
      }

      const nextDraft: AIEditorDraft = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${intent.mode}`,
        storyId,
        chapterId: focusPayload?.chapterId ?? null,
        mode: intent.mode,
        sourceText: contextText || intent.prompt,
        resultText,
        createdAt: new Date().toISOString(),
      };

      if (onDraftGenerated) {
        onDraftGenerated(nextDraft);
      } else {
        onDraftUpdated?.(nextDraft);
      }
      setMessages((items) => [
        ...items,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${intent.id}-notice`,
          role: "assistant",
          content: `已生成「${intent.shortLabel}」草稿，可在草稿区处理。`,
        },
      ]);
    } catch (error) {
      showGenerateError(error);
    } finally {
      timeout.clear();
      setRegenerating(false);
    }
  };

  const handleCompletionReview = async () => {
    if (completionReviewing || isLoading) return;
    if (isCreditPreviewDisabled("completion:chapter_completion_review")) return;
    if (writingBriefLoading) {
      toast.error("写作目标加载中，请稍后再检查");
      return;
    }
    if (!currentChapterId) {
      toast.error("请先选择一个章节");
      return;
    }
    if (writingBrief?.chapterId && writingBrief.chapterId !== currentChapterId) {
      toast.error("章节目标仍在同步，请稍后再试");
      return;
    }

    if (!normalizedCurrentChapterText) {
      toast.error("当前章节没有可检查的正文");
      return;
    }

    const prompt = buildChapterCompletionInput({
      chapterName: writingBrief?.chapterName ?? currentChapterName ?? "当前章节",
      chapterText: normalizedCurrentChapterText,
      primaryGoal: writingBrief?.primaryGoal ?? "检查当前章节是否完成应有的剧情推进。",
      mustInclude: writingBrief?.mustInclude ?? [],
      nextBeatTitle: writingBrief?.nextBeatTitle ?? null,
    });

    setActiveTab("ai");
    setCompletionReviewing(true);
    const timeout = createGenerateTimeout();

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeout.signal,
        body: JSON.stringify({
          mode: "chapter_completion_review",
          storyId,
          prompt,
          provider: aiProvider,
          model: aiModel,
          focusPayload,
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

      const resultText = await readTextFromDataStream(res.body);
      if (!resultText.trim()) {
        toast.error("完章检查没有返回可用内容");
        return;
      }

      setMessages((items) => [
        ...items,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-chapter-completion-review`,
          role: "assistant",
          content: `「完章检查」结果：\n\n${resultText}`,
        },
      ]);
    } catch (error) {
      showGenerateError(error);
    } finally {
      timeout.clear();
      setCompletionReviewing(false);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!draft || regenerating) return;
    if (isCreditPreviewDisabled(`draft:${draft.mode}`)) return;

    const controller = new AbortController();
    regenerateAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);
    setRegenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: draft.mode,
          storyId,
          prompt: draft.sourceText,
          provider: aiProvider,
          model: aiModel,
          focusPayload,
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

      const resultText = await readTextFromDataStream(res.body);
      if (!resultText.trim()) {
        toast.error("重新生成没有返回内容");
        return;
      }

      const nextDraft: AIEditorDraft = {
        ...draft,
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${draft.mode}`,
        resultText,
        createdAt: new Date().toISOString(),
      };
      delete nextDraft.decision;

      onDraftUpdated?.(nextDraft);
    } catch (error) {
      showGenerateError(error);
    } finally {
      window.clearTimeout(timeout);
      if (regenerateAbortRef.current === controller) {
        regenerateAbortRef.current = null;
      }
      setRegenerating(false);
    }
  };

  const handleCancelRegenerate = () => {
    regenerateAbortRef.current?.abort();
    regenerateAbortRef.current = null;
    setRegenerating(false);
  };

  const rememberDraft = async (selectedDraft: AIEditorDraft) => {
    if (rememberingDraftIdRef.current === selectedDraft.id) return;

    rememberingDraftIdRef.current = selectedDraft.id;
    setRememberingDraftId(selectedDraft.id);

    try {
      const res = await fetch(`/api/stories/${storyId}/memory/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "author_preference",
          text: selectedDraft.resultText,
          source: "ai_draft",
        }),
      });

      if (!res.ok) {
        toast.error("记忆保存失败");
        return;
      }

      toast.success("已保存到写作记忆");
    } catch {
      toast.error("记忆保存失败");
    } finally {
      if (rememberingDraftIdRef.current === selectedDraft.id) {
        rememberingDraftIdRef.current = null;
        setRememberingDraftId(null);
      }
    }
  };

  const handleMemoryInboxDecision = async (
    finding: ConsistencyFinding,
    decision: "accepted" | "dismissed",
  ) => {
    setMemoryInboxActingId(finding.id);
    try {
      const response = await fetch(`/api/stories/${storyId}/consistency/inbox`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: finding.id, decision }),
      });
      if (!response.ok) {
        toast.error("记忆处理失败");
        return;
      }
      setMemoryInbox((items) => items.filter((item) => item.id !== finding.id));
      toast.success(decision === "accepted" ? "已加入写作记忆" : "已忽略记忆候选");
      void loadConsistencyFindings();
    } catch {
      toast.error("记忆处理失败");
    } finally {
      setMemoryInboxActingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="studio-command-button flex h-8 w-8 items-center justify-center rounded-full border-0 text-[var(--workspace-ai)] shadow-none">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">AI 助手</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {currentChapterName ?? "未选择章节"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="studio-command-button h-8 rounded-full border-0 px-3 text-xs shadow-none"
          >
            清除对话
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 gap-0 overflow-hidden">
        <TabsList className="studio-glass studio-command-pill mx-3 mt-1 grid h-10 w-auto grid-cols-3 p-1">
          <TabsTrigger value="ai" className="h-8 rounded-full text-xs data-[state=active]:bg-workspace-paper data-[state=active]:shadow-sm dark:data-[state=active]:bg-workspace-surface-strong">
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </TabsTrigger>
          <TabsTrigger value="references" className="h-8 rounded-full text-xs data-[state=active]:bg-workspace-paper data-[state=active]:shadow-sm dark:data-[state=active]:bg-workspace-surface-strong">
            <FileText className="h-3.5 w-3.5" />
            资料
          </TabsTrigger>
          <TabsTrigger value="outline" className="h-8 rounded-full text-xs data-[state=active]:bg-workspace-paper data-[state=active]:shadow-sm dark:data-[state=active]:bg-workspace-surface-strong">
            <ListTree className="h-3.5 w-3.5" />
            大纲
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="min-h-0 flex-1" data-testid="ai-assistant-scroll">
            <div className="space-y-3 p-3 pb-4">
              <div className="flex items-center justify-between px-1 text-xs">
                <p className="font-medium text-muted-foreground">当前任务</p>
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                  {currentChapterName ?? "未选择章节"}
                </Badge>
              </div>

              <div>
                <WritingTargetCard brief={writingBrief} loading={writingBriefLoading} />
                <div className="mt-2 rounded-xl border border-workspace-border/70 bg-workspace-paper/62 p-3 text-xs dark:bg-workspace-surface">
                  {writingBriefLoading ? (
                    <p className="text-muted-foreground">蓝图上下文加载中...</p>
                  ) : writingBrief?.beatTitle ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-muted-foreground">当前节拍</p>
                        <p className="mt-0.5 font-medium text-foreground">
                          {writingBrief.beatTitle}
                        </p>
                      </div>
                      {currentSceneCard ? (
                        <div className="grid gap-2">
                          <div>
                            <p className="text-muted-foreground">本场目标</p>
                            <p className="mt-0.5 leading-5 text-foreground">
                              {currentSceneCard.goal || "未填写"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">章末钩子</p>
                            <p className="mt-0.5 leading-5 text-foreground">
                              {currentSceneCard.endingHook || "未填写"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-workspace-border/70 px-3 py-2 text-muted-foreground">
                          <span>未关联场景卡</span>
                          <Link
                            href={`/stories/${storyId}/blueprint`}
                            className="text-foreground underline underline-offset-4"
                          >
                            去蓝图关联
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>未关联节拍</span>
                      <Link
                        href={`/stories/${storyId}/blueprint`}
                        className="text-foreground underline underline-offset-4"
                      >
                        去蓝图关联
                      </Link>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-9 w-full justify-center gap-2 rounded-xl border-workspace-border/70 bg-workspace-paper/62 text-xs hover:bg-workspace-paper dark:bg-workspace-surface dark:hover:bg-workspace-muted"
                  onClick={handleCompletionReview}
	                  disabled={
	                    isLoading ||
	                    regenerating ||
	                    completionReviewing ||
	                    writingBriefLoading ||
	                    !currentChapterId ||
	                    !normalizedCurrentChapterText ||
	                    previews["completion:chapter_completion_review"]?.isDisabled
	                  }
	                >
	                  {completionReviewing ? (
	                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
	                  ) : (
	                    <FileCheck2 className="h-3.5 w-3.5" />
	                  )}
	                  完章检查
	                  <AICreditBadge
	                    preview={previews["completion:chapter_completion_review"]}
	                    loading={creditPreviewLoading}
	                  />
	                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="studio-soft-panel rounded-full px-3 py-1">
                    当前焦点
                  </span>
                  <span className="studio-command-button max-w-full truncate rounded-full px-3 py-1 text-foreground">
                    {currentChapterName ?? "未选择章节"}
                  </span>
                </div>
                {focusPayload?.cursorContext?.currentParagraph ? (
                  <p className="mt-2 line-clamp-2 rounded-xl bg-workspace-paper/70 px-3 py-2 leading-5">
                    {focusPayload.cursorContext.currentParagraph}
                  </p>
                ) : null}
              </div>

              <MemoryInboxPanel
                items={memoryInbox}
                loading={memoryInboxLoading}
                actingId={memoryInboxActingId}
                onAccept={(finding) => handleMemoryInboxDecision(finding, "accepted")}
                onDismiss={(finding) => handleMemoryInboxDecision(finding, "dismissed")}
              />

              {draft ? (
                <section className={regenerating ? "studio-soft-panel liquid-ai-glow rounded-2xl p-3" : "studio-soft-panel rounded-2xl p-3"}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {MODE_LABELS[draft.mode] ?? "AI 草稿"}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {draft.sourceText.length} 字
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        预览后选择应用方式
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none"
                      onClick={onClearDraft}
                      title="关闭草稿"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative rounded-xl border border-workspace-border/70 bg-workspace-paper shadow-sm">
                    <div
                      className={
                        showFullDraftPreview
                          ? "max-h-72 overflow-auto p-3 text-sm leading-6 whitespace-pre-wrap"
                          : "max-h-36 overflow-hidden p-3 text-sm leading-6 whitespace-pre-wrap"
                      }
                    >
                      {regenerating ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          正在重新生成...
                        </div>
                      ) : (
                        draft.resultText
                      )}
                    </div>
                    {isDraftPreviewLong && !showFullDraftPreview ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-gradient-to-t from-workspace-paper to-transparent" />
                    ) : null}
                  </div>
                  {isDraftPreviewLong ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-8 w-full gap-1 rounded-full text-xs text-muted-foreground hover:bg-workspace-paper/70 hover:text-foreground dark:hover:bg-workspace-muted"
                      onClick={() => setDraftPreviewExpanded((expanded) => !expanded)}
                      disabled={regenerating}
                    >
                      {draftPreviewExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {draftPreviewExpanded ? "收起预览" : "展开全文"}
                    </Button>
                  ) : null}
                  <div className="studio-glass studio-command-pill mt-2 grid grid-cols-3 gap-1 p-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                      onClick={() => onApplyDraft?.("insert", draft)}
                      disabled={regenerating || isApplyingDraft}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      插入
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                      onClick={() => onApplyDraft?.("replace", draft)}
                      disabled={regenerating || isApplyingDraft || !draft.selection}
                      title={draft.selection ? "替换原选区" : "此草稿没有可替换选区"}
                    >
                      <Replace className="h-3.5 w-3.5" />
                      替换
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                      onClick={() => onApplyDraft?.("append", draft)}
                      disabled={regenerating || isApplyingDraft || !draft.selection}
                      title={draft.selection ? "追加到原选区后" : "此草稿没有可追加选区"}
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      追加
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <Button
                      size="sm"
	                      variant="ghost"
	                      className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/70 dark:hover:bg-workspace-muted"
	                      onClick={handleRegenerateDraft}
	                      disabled={regenerating || previews[`draft:${draft.mode}`]?.isDisabled}
	                    >
	                      {regenerating ? (
	                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
	                      ) : (
	                        <RefreshCw className="h-3.5 w-3.5" />
	                      )}
	                      重新生成
	                      <AICreditBadge
	                        preview={previews[`draft:${draft.mode}`]}
	                        loading={creditPreviewLoading}
	                      />
	                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/70 dark:hover:bg-workspace-muted"
                      onClick={handleCancelRegenerate}
                      disabled={!regenerating}
                    >
                      <X className="h-3.5 w-3.5" />
                      取消生成
                    </Button>
                  </div>
                  <ConsistencyFindingsPanel
                    findings={consistencyFindings}
                    loading={consistencyLoading}
                    onRefresh={loadConsistencyFindings}
                  />
                </section>
              ) : null}

              {draftCandidates.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-1 text-xs">
                    <p className="font-medium text-muted-foreground">待处理候选</p>
                    <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                      {draftCandidates.length}
                    </Badge>
                  </div>
                  <AIDraftCandidates
                    candidates={draftCandidates}
                    activeDraftId={draft?.id}
                    disabled={regenerating || isApplyingDraft}
                    rememberingDraftId={rememberingDraftId}
                    onSelect={onSelectDraft}
                    onApply={onApplyDraft}
                    onCopy={onCopyDraft}
                    onDiscard={onDiscardDraft}
                    onMarkReference={onMarkDraftReference}
                    onRemember={rememberDraft}
                  />
                </>
              ) : null}

              <div className="flex items-center justify-between px-1 text-xs">
                <p className="font-medium text-muted-foreground">AI 对话</p>
                <span className="text-[11px] text-muted-foreground">
                  讨论、追问、临时灵感
                </span>
              </div>

              <div>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="studio-soft-panel flex flex-col items-center justify-center rounded-2xl border-dashed px-4 py-7 text-center text-muted-foreground">
                      <span className="studio-command-button mb-2 flex h-11 w-11 items-center justify-center rounded-full border-0 text-[var(--workspace-ai)] shadow-none">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-medium text-foreground">向 AI 助手提问</p>
                      <p className="mt-1 text-xs">或使用下方快捷功能</p>
                    </div>
                    {WRITING_INTENT_GROUPS.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <p className="px-1 text-xs font-medium text-muted-foreground">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {group.intents.map((intent) => (
                            <Button
                              key={intent.id}
                              variant="outline"
                              size="sm"
	                              className="h-auto min-h-9 justify-start gap-2 rounded-xl border-workspace-border/70 bg-workspace-paper/62 py-2 text-xs hover:bg-workspace-paper dark:bg-workspace-surface dark:hover:bg-workspace-muted"
	                              onClick={() => handleQuickAction(intent)}
	                              disabled={isLoading || regenerating || previews[`intent:${intent.mode}`]?.isDisabled}
	                              title={intent.description}
	                            >
	                              <span className="min-w-0 truncate">{intent.shortLabel}</span>
	                              <AICreditBadge
	                                preview={previews[`intent:${intent.mode}`]}
	                                loading={creditPreviewLoading}
	                              />
	                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message, index) => {
                      const isAssistant = message.role === "assistant";
                      const messageContent = typeof message.content === "string" ? message.content : "";
                      const previousUserMessage = getPreviousUserMessage(index);
                      const isAdvisoryReply = isAdvisoryChatReply(previousUserMessage, messageContent);
                      return (
                        <div
                          key={message.id}
                          className={`rounded-xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap ${
                            message.role === "user"
                              ? "ml-8 bg-[var(--workspace-accent)] text-white shadow-sm"
                              : "mr-8 border border-workspace-border/70 bg-workspace-paper/72 text-foreground dark:bg-workspace-surface"
                          }`}
                        >
                          {message.content}
                          {isAssistant && messageContent.trim() ? (
                            <div className="mt-2 flex flex-wrap gap-1 whitespace-normal">
                              {onApplyDraft ? (
                                isAdvisoryReply ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                                    onClick={() => saveAssistantMessageAsReference({ id: message.id, content: messageContent }, index)}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    保存参考
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                                    onClick={() => insertAssistantMessage({ id: message.id, content: messageContent }, index)}
                                    disabled={isApplyingDraft}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    插入正文
                                  </Button>
                                )
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                                onClick={() => copyAssistantMessage(messageContent)}
                              >
                                <Clipboard className="h-3.5 w-3.5" />
                                复制
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        思考中...
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div ref={aiContentEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="border-t border-workspace-border/60 bg-workspace-paper/40 p-2 dark:bg-workspace-surface">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="向 AI 助手提问..."
                className="min-h-[60px] resize-none rounded-2xl border-workspace-border/80 bg-workspace-paper/90"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
	                size="icon"
	                className="studio-command-button h-[60px] w-20 flex-col gap-1 rounded-2xl bg-[var(--workspace-ai)] px-2 text-white hover:bg-[var(--workspace-ai)]/90"
	                disabled={isLoading || !input.trim() || previews["chat:send"]?.isDisabled}
	              >
	                <span className="flex items-center gap-1 text-xs">
	                  <Send className="h-3.5 w-3.5" />
	                  发送
	                </span>
	                <AICreditBadge
	                  preview={previews["chat:send"]}
	                  loading={creditPreviewLoading}
	                />
	              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="references" className="min-h-0 overflow-hidden">
          <ScrollArea className="h-full min-h-0 p-3">
            <div className="space-y-3 text-sm">
              <div className="studio-soft-panel rounded-xl p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  当前章节
                </p>
                <p>{currentChapterName ?? "未选择章节"}</p>
              </div>
              <div className="studio-soft-panel rounded-xl p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  当前段落
                </p>
                <p className="whitespace-pre-wrap rounded-lg border border-workspace-border/70 bg-workspace-paper/90 p-2 text-xs leading-5">
                  {focusPayload?.cursorContext?.currentParagraph || "暂无光标上下文"}
                </p>
              </div>
              {draft ? (
                <div className="studio-soft-panel rounded-xl p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    草稿来源选区
                  </p>
                  <p className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-workspace-border/70 bg-workspace-paper/90 p-2 text-xs leading-5">
                    {draft.sourceText}
                  </p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="outline" className="min-h-0 overflow-hidden">
          <ScrollArea className="h-full min-h-0 p-3">
            <div className="space-y-3">
              <p className="studio-soft-panel rounded-xl p-3 text-sm text-muted-foreground">
                围绕当前章节生成结构建议。
              </p>
              {WRITING_INTENT_GROUPS.find((group) => group.id === "quality-check")?.intents.map((intent) => (
                <Button
                  key={intent.id}
                  variant="outline"
                  size="sm"
	                  className="h-auto w-full justify-start gap-2 rounded-xl border-workspace-border/70 bg-workspace-paper/62 py-2 text-xs hover:bg-workspace-paper dark:bg-workspace-surface dark:hover:bg-workspace-muted"
	                  onClick={() => handleQuickAction(intent)}
	                  disabled={isLoading || regenerating || previews[`intent:${intent.mode}`]?.isDisabled}
	                  title={intent.description}
	                >
	                  <span className="min-w-0 truncate">{intent.label}</span>
	                  <AICreditBadge
	                    preview={previews[`intent:${intent.mode}`]}
	                    loading={creditPreviewLoading}
	                  />
	                </Button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
