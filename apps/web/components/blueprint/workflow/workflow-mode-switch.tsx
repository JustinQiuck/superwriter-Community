"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import type {
  BlueprintWorkflowMode,
  BlueprintWorkflowState,
} from "@/lib/blueprint/workflow-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WORKFLOW_MODE_OPTIONS: Array<{
  value: BlueprintWorkflowMode;
  label: string;
}> = [
  { value: "guided", label: "完整规划" },
  { value: "planning-light", label: "轻量大纲" },
  { value: "freewrite", label: "先写后理" },
];

interface WorkflowModeSwitchProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function WorkflowModeSwitch({
  storyId,
  blueprint,
  workflow,
}: WorkflowModeSwitchProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleModeChange = async (mode: BlueprintWorkflowMode) => {
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
              mode,
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
    <Select
      value={workflow.mode}
      onValueChange={(value) => handleModeChange(value as BlueprintWorkflowMode)}
      disabled={saving}
    >
      <SelectTrigger size="sm" className="h-8 w-[112px] bg-workspace-paper/70 dark:bg-workspace-surface-strong">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WORKFLOW_MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
