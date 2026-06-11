"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import type {
  BlueprintWorkflowState,
  MiceConflictType,
  StoryContractInput,
} from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MICE_OPTIONS: Array<{ value: MiceConflictType; label: string }> = [
  { value: "milieu", label: "环境/世界探索" },
  { value: "inquiry", label: "谜题/调查" },
  { value: "character", label: "人物转变" },
  { value: "event", label: "事件失衡" },
];

const SHORT_FIELDS: Array<{
  key: keyof Pick<
    StoryContractInput,
    | "genre"
    | "tone"
    | "targetReader"
    | "coreHook"
    | "protagonistSeed"
    | "protagonistWant"
    | "protagonistFlaw"
    | "oppositionForce"
    | "storyQuestion"
  >;
  label: string;
  placeholder: string;
}> = [
  { key: "genre", label: "类型", placeholder: "都市悬疑 / 玄幻 / 科幻" },
  { key: "tone", label: "语气", placeholder: "冷峻、热血、轻松、压抑" },
  { key: "targetReader", label: "目标读者", placeholder: "喜欢强情节悬疑的读者" },
  { key: "coreHook", label: "核心钩子", placeholder: "一句话说明读者为什么想看下去" },
  { key: "protagonistSeed", label: "主角种子", placeholder: "主角身份和初始处境" },
  { key: "protagonistWant", label: "主角想要", placeholder: "主角明确追求的目标" },
  { key: "protagonistFlaw", label: "主角缺陷", placeholder: "阻碍主角成长的问题" },
  { key: "oppositionForce", label: "对立力量", placeholder: "反派、制度、灾难或秘密" },
  { key: "storyQuestion", label: "故事问题", placeholder: "这本书最终要回答的问题" },
];

const LONG_FIELDS: Array<{
  key: keyof Pick<
    StoryContractInput,
    "readerPromise" | "centralConflict" | "stakes" | "endingDirection"
  >;
  label: string;
  placeholder: string;
}> = [
  { key: "readerPromise", label: "读者承诺", placeholder: "这本书会持续兑现什么情绪、爽点或体验？" },
  { key: "centralConflict", label: "中心冲突", placeholder: "主角目标和阻力之间的持续冲突是什么？" },
  { key: "stakes", label: "失败代价", placeholder: "如果主角失败，会失去什么？" },
  { key: "endingDirection", label: "结局方向", placeholder: "先写一个大方向，不需要锁死细节。" },
];

interface StoryContractPanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function StoryContractPanel({
  storyId,
  blueprint,
  workflow,
}: StoryContractPanelProps) {
  const router = useRouter();
  const [contract, setContract] = useState<StoryContractInput>(workflow.contract);
  const [saving, setSaving] = useState(false);

  const updateContract = <Key extends keyof StoryContractInput>(
    key: Key,
    value: StoryContractInput[Key],
  ) => {
    setContract((current) => ({ ...current, [key]: value }));
  };

  const saveContract = async () => {
    setSaving(true);
    try {
      await fetch(`/api/stories/${storyId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...blueprint.settings,
            workflow: {
              ...workflow,
              contract,
              completedSteps: Array.from(
                new Set([...workflow.completedSteps, "contract"]),
              ),
              currentStep: "synopsis",
            },
          },
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">故事契约</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          先确定读者承诺、主角欲望、对立力量和失败代价，再进入简介生成。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SHORT_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={`contract-${field.key}`}>{field.label}</Label>
            <Input
              id={`contract-${field.key}`}
              value={contract[field.key]}
              onChange={(event) => updateContract(field.key, event.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        ))}

        <div className="grid gap-2">
          <Label>冲突类型</Label>
          <Select
            value={contract.miceType}
            onValueChange={(value) =>
              updateContract("miceType", value as MiceConflictType)
            }
          >
            <SelectTrigger className="w-full bg-workspace-paper/70 dark:bg-workspace-surface-strong">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MICE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {LONG_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={`contract-${field.key}`}>{field.label}</Label>
            <Textarea
              id={`contract-${field.key}`}
              value={contract[field.key]}
              onChange={(event) => updateContract(field.key, event.target.value)}
              placeholder={field.placeholder}
              rows={4}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={saveContract} disabled={saving}>
          {saving ? "保存中..." : "保存并进入简介候选"}
        </Button>
      </div>
    </div>
  );
}
