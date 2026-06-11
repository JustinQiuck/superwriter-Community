"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import type {
  BlueprintWorkflowState,
  StructureTemplate,
} from "@/lib/blueprint/workflow-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STRUCTURE_TEMPLATES: Array<{
  value: StructureTemplate;
  label: string;
  description: string;
}> = [
  { value: "three_act", label: "三幕式", description: "适合大多数类型小说，强调起承转合。" },
  { value: "save_the_cat", label: "Save the Cat", description: "适合商业类型故事，强调15个节拍和读者承诺。" },
  { value: "snowflake", label: "雪花法", description: "从一句话逐层扩写，适合从概念发展完整故事。" },
  { value: "web_serial", label: "网文连载", description: "强调章节钩子、爽点兑现、节奏循环和追读。" },
  { value: "freeform", label: "自由模式", description: "保留卡片式大纲，不强制结构。" },
];

interface StructureTemplatePanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function StructureTemplatePanel({
  storyId,
  blueprint,
  workflow,
}: StructureTemplatePanelProps) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<StructureTemplate>(
    workflow.structureTemplate,
  );
  const [saving, setSaving] = useState(false);

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...blueprint.settings,
            workflow: {
              ...workflow,
              structureTemplate: selectedTemplate,
              completedSteps: Array.from(
                new Set([...workflow.completedSteps, "structure"]),
              ),
              currentStep: "outline",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("保存结构模板失败");
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">结构模板</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          选择生成整体大纲时采用的结构约束。后续仍可自由调整。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {STRUCTURE_TEMPLATES.map((template) => {
          const active = selectedTemplate === template.value;

          return (
            <button
              key={template.value}
              type="button"
              onClick={() => setSelectedTemplate(template.value)}
              className={cn(
                "rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-5 text-left shadow-sm transition dark:bg-workspace-surface-strong",
                active
                  ? "border-[var(--module-blueprint)]/50 ring-2 ring-[var(--module-blueprint)]/20"
                  : "hover:border-foreground/20 hover:bg-workspace-paper dark:hover:bg-workspace-muted",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    active ? "bg-[var(--module-blueprint)]" : "bg-muted-foreground/30",
                  )}
                />
                <span className="font-semibold">{template.label}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={saveTemplate} disabled={saving}>
          {saving ? "保存中..." : "确认结构，进入整体大纲"}
        </Button>
      </div>
    </div>
  );
}
