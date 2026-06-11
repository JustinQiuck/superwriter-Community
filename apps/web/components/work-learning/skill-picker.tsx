"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WORK_LEARNING_SKILLS } from "@/lib/work-learning/skill-registry";
import type { WorkLearningSkillId } from "@/lib/work-learning/types";

interface SkillPickerProps {
  value: WorkLearningSkillId;
  onChange: (value: WorkLearningSkillId) => void;
}

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">拆解规则</h2>
        <p className="text-sm text-muted-foreground">选择这次想训练的观察角度。</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {WORK_LEARNING_SKILLS.map((skill) => {
          const selected = skill.id === value;
          return (
            <Button
              key={skill.id}
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-[96px] items-start justify-start rounded-lg border-workspace-border/70 bg-workspace-paper/72 p-3 text-left hover:bg-workspace-paper",
                selected && "border-[var(--workspace-ai)] bg-workspace-paper shadow-sm",
              )}
              onClick={() => onChange(skill.id)}
            >
              <span className="min-w-0 space-y-2">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{skill.label}</span>
                  {selected ? (
                    <Badge variant="secondary" className="rounded-full px-2 text-[10px]">
                      已选
                    </Badge>
                  ) : null}
                </span>
                <span className="block whitespace-normal text-xs leading-5 text-muted-foreground">
                  {skill.description}
                </span>
                <span className="block whitespace-normal text-[11px] text-muted-foreground/80">
                  适合：{skill.recommendedInput}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
