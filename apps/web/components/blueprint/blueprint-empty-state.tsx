"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultBlueprintWorkflowState,
  defaultStoryContract,
} from "@/lib/blueprint/workflow-state";
import type {
  StoryContractInput,
  StructureTemplate,
} from "@/lib/blueprint/workflow-types";
import { FileText, Plus } from "lucide-react";

interface BlueprintEmptyStateProps {
  storyId: string;
}

const TEMPLATE_OPTIONS: Array<{
  label: string;
  value: StructureTemplate;
  description: string;
}> = [
  {
    label: "网文连载",
    value: "web_serial",
    description: "适合日更连载，强调开章钩子、节奏推进和章末悬念。",
  },
  {
    label: "三幕式",
    value: "three_act",
    description: "适合先搭主线结构，按建立、对抗、解决推进故事。",
  },
  {
    label: "雪花法",
    value: "snowflake",
    description: "适合从一句话扩展到简介、人物、场景和章节。",
  },
  {
    label: "自由写作",
    value: "freeform",
    description: "适合先写正文，再逐步反向同步蓝图。",
  },
];

const TEMPLATE_CONTRACT_HINTS: Record<
  StructureTemplate,
  Partial<StoryContractInput>
> = {
  web_serial: {
    genre: "网文连载",
    targetReader: "喜欢持续追读、强钩子和节奏推进的类型读者",
    coreHook: "先写一个开篇钩子：主角遇到什么异常，读者为什么必须看下一章？",
    readerPromise: "每章推进一个明确问题，兑现一个爽点或悬念，并留下章末悬念。",
    centralConflict: "主角目标和持续阻力之间的反复拉扯，最好能支撑多章循环。",
    stakes: "如果主角失败，读者最在意的人、秘密、身份或世界秩序会付出什么代价？",
    endingDirection: "先写一个阶段性大反转或卷末兑现方向，不需要锁死全书结局。",
    miceType: "event",
  },
  three_act: {
    genre: "三幕式故事",
    coreHook: "主角的日常被什么事件打破？",
    readerPromise: "建立目标、升级对抗，并在高潮中兑现核心冲突。",
    centralConflict: "主角想要的东西和对立力量之间的主线冲突。",
    endingDirection: "主角通过最终选择解决核心失衡。",
    miceType: "event",
  },
  save_the_cat: {
    genre: "商业类型故事",
    targetReader: "期待清晰类型承诺、强情节点和角色转变的读者",
    coreHook: "一句话说明主角、困境和独特卖点。",
    readerPromise: "用清晰节拍持续兑现类型快感和角色变化。",
    centralConflict: "主角欲望、缺陷和外部阻力之间的持续碰撞。",
    endingDirection: "主角用新的价值观完成终局选择。",
    miceType: "character",
  },
  snowflake: {
    genre: "雪花法故事",
    coreHook: "先用一句话概括主角、目标和最大阻力。",
    readerPromise: "从一句话逐层扩写到简介、人物、场景和章节。",
    centralConflict: "当前一句话概念中最核心的目标与阻力。",
    endingDirection: "先写一个可以继续扩展的结局信号。",
    miceType: "inquiry",
  },
  freeform: {
    genre: "自由写作",
    coreHook: "先保留最想写的画面、冲突或一句话灵感。",
    readerPromise: "允许先写正文，再从正文反向整理读者承诺。",
    centralConflict: "暂时写下当前最清楚的一组矛盾。",
    endingDirection: "可以留空或写一个模糊方向，后续再同步修正。",
    miceType: "event",
  },
};

export function BlueprintEmptyState({ storyId }: BlueprintEmptyStateProps) {
  const router = useRouter();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<StructureTemplate | null>(null);

  const handleCreate = async (template?: StructureTemplate) => {
    const selectedTemplate = template ?? "freeform";
    setCreatingTemplate(selectedTemplate);
    const res = await fetch(`/api/stories/${storyId}/blueprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "叙事蓝图",
        settings: {
          workflow: {
            ...defaultBlueprintWorkflowState,
            structureTemplate: selectedTemplate,
            contract: {
              ...defaultStoryContract,
              ...TEMPLATE_CONTRACT_HINTS[selectedTemplate],
            },
          },
        },
      }),
    });

    if (res.ok) {
      setTemplateDialogOpen(false);
      router.refresh();
    }
    setCreatingTemplate(null);
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">创建叙事蓝图</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              蓝图帮助你有结构地规划故事节奏、情绪曲线和章节安排。
              选择一个叙事模板开始，或从空白蓝图开始创作。
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleCreate()}>
              <Plus className="mr-1.5 h-4 w-4" />
              空白蓝图
            </Button>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              从模板创建
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择叙事模板</DialogTitle>
            <DialogDescription>
              先选择一种结构起点。之后仍然可以在蓝图里调整模式和细节。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATE_OPTIONS.map((template) => (
              <Button
                key={template.value}
                type="button"
                variant="outline"
                aria-label={template.label}
                disabled={creatingTemplate !== null}
                onClick={() => handleCreate(template.value)}
                className="h-auto justify-start rounded-lg p-4 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold">{template.label}</span>
                  <span className="mt-1 block whitespace-normal text-xs leading-5 text-muted-foreground">
                    {template.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
