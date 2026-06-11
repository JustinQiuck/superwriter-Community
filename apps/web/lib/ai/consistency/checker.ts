import { resolveConsistencyDisplay } from "@/lib/ai/consistency/rules";
import type { MemoryContext } from "@/types/memory";
import type {
  CreateConsistencyFindingInput,
  RunConsistencyCheckInput,
} from "@/types/consistency";

type CheckInput = RunConsistencyCheckInput & {
  memoryContext: MemoryContext;
};

export async function runConsistencyCheck(
  input: CheckInput,
): Promise<CreateConsistencyFindingInput[]> {
  return [
    ...detectCharacterStateContradictions(input),
    ...detectSettingConstraintCandidates(input),
    ...detectTimelineConflicts(input),
    ...detectUnresolvedPromises(input),
  ];
}

function detectCharacterStateContradictions(
  input: CheckInput,
): CreateConsistencyFindingInput[] {
  const characters = input.memoryContext.coreMemory?.currentSnapshot.mainCharacters ?? [];

  return characters.flatMap((character) => {
    const status = normalizeText(character.status);
    const rightHandUnavailable = /右手.*(骨裂|断|伤|无法|不能|不便)/.test(status);
    const textUsesRightHandWeapon = new RegExp(
      `${escapeRegExp(character.name)}.{0,16}右手.{0,16}(剑|刀|枪|握|持|劈|刺)`,
    ).test(input.generatedText);

    if (!rightHandUnavailable || !textUsesRightHandWeapon) return [];

    const display = resolveConsistencyDisplay({
      confidence: "high",
      severity: "high",
      hasMemoryCandidate: true,
    });

    return [{
      ...baseFinding(input),
      type: "contradiction",
      severity: "high",
      title: "角色状态可能矛盾",
      detail: `草稿描写「${character.name}」右手持用武器，但当前角色状态为「${status}」。`,
      evidence: [{
        kind: "memory",
        label: "核心记忆角色状态",
        value: `${character.name}：${status}`,
      }],
      suggestion: display.shouldShowInline
        ? "请改为左手、借助外物，或先解释右手状态已经恢复。"
        : null,
      memoryKey: display.shouldCreateMemoryCandidate ? "角色状态约束" : null,
      memoryValue: display.shouldCreateMemoryCandidate
        ? `${character.name} 当前状态：${status}`
        : null,
    }];
  });
}

function detectSettingConstraintCandidates(
  input: CheckInput,
): CreateConsistencyFindingInput[] {
  const match = input.generatedText.match(/([^。！？\n]{2,40}(不能|无法|必须|只能)[^。！？\n]{2,80})[。！？]/);
  if (!match) return [];

  const rule = normalizeText(match[1]);
  const display = resolveConsistencyDisplay({
    confidence: "high",
    severity: "medium",
    hasMemoryCandidate: true,
  });

  return [{
    ...baseFinding(input),
    type: "missing_detail",
    severity: "medium",
    title: "设定规则候选",
    detail: `这句话像是可长期遵守的设定规则：「${rule}」。`,
    evidence: [{
      kind: "chapter",
      label: "章节文本",
      value: rule,
      ref: input.sourceRef ?? undefined,
    }],
    suggestion: "确认后可加入核心记忆，后续生成会持续遵守。",
    memoryKey: display.shouldCreateMemoryCandidate ? "关键约束" : null,
    memoryValue: display.shouldCreateMemoryCandidate ? rule : null,
  }];
}

function detectTimelineConflicts(
  input: CheckInput,
): CreateConsistencyFindingInput[] {
  const currentBeat = input.memoryContext.coreMemory?.currentSnapshot.currentBeat ?? "";
  const textLooksNight = /(夜|月色|黑暗|深夜|星光)/.test(input.generatedText);
  const beatLooksMorning = /(清晨|早晨|晨|黎明)/.test(currentBeat);
  if (!textLooksNight || !beatLooksMorning) return [];

  return [{
    ...baseFinding(input),
    type: "timeline_conflict",
    severity: "medium",
    title: "时间线需要确认",
    detail: `当前节拍像是「${currentBeat}」，但文本出现夜晚描写。`,
    evidence: [{
      kind: "memory",
      label: "核心记忆当前节拍",
      value: currentBeat,
    }, {
      kind: "chapter",
      label: "章节文本",
      value: excerpt(input.generatedText, /(夜|月色|黑暗|深夜|星光)/),
      ref: input.sourceRef ?? undefined,
    }],
    suggestion: "统一场景时间，或补一句说明时间跳转。",
  }];
}

function detectUnresolvedPromises(
  input: CheckInput,
): CreateConsistencyFindingInput[] {
  if (!/(钥匙|信物|印记|暗号|预言|线索)/.test(input.generatedText)) return [];

  return [{
    ...baseFinding(input),
    type: "promise_unresolved",
    severity: "low",
    title: "伏笔线索候选",
    detail: "文本中出现可能需要追踪的线索、信物或承诺。",
    evidence: [{
      kind: "chapter",
      label: "章节文本",
      value: input.generatedText.slice(0, 180),
      ref: input.sourceRef ?? undefined,
    }],
    suggestion: "如这是长期伏笔，可记录到记忆中方便后续回收。",
    memoryKey: "伏笔线索",
    memoryValue: input.generatedText.slice(0, 180),
  }];
}

function baseFinding(input: CheckInput): Pick<
  CreateConsistencyFindingInput,
  "storyId" | "chapterId" | "sourceType" | "sourceId" | "sourceRouteKey" | "sourceRef"
> {
  return {
    storyId: input.storyId,
    chapterId: input.chapterId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    sourceRouteKey: input.sourceRouteKey ?? null,
    sourceRef: input.sourceRef ?? null,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerpt(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  if (!match) return text.slice(0, 160);
  const index = Math.max(0, match.index - 40);
  return text.slice(index, index + 160);
}
