import { cn } from "@/lib/utils";
import type { ImportCurrentStep } from "@/types/import";

const STEPS: Array<{ value: ImportCurrentStep; label: string; targetId: string }> = [
  { value: "file", label: "文件", targetId: "import-step-file" },
  { value: "sections", label: "章节", targetId: "import-step-sections" },
  { value: "analysis", label: "分析", targetId: "import-step-analysis" },
  { value: "review", label: "审阅", targetId: "import-step-review" },
  { value: "apply", label: "应用", targetId: "import-step-apply" },
];

export function ImportStepRail({ currentStep }: { currentStep: ImportCurrentStep }) {
  const currentIndex = Math.max(0, STEPS.findIndex((step) => step.value === currentStep));

  return (
    <nav aria-label="导入步骤" className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const active = index === currentIndex;
        const complete = currentIndex > index;
        const unlocked = complete || active;
        const className = cn(
          "flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
          active && "border-primary bg-primary text-primary-foreground",
          complete && !active && "bg-muted text-foreground hover:bg-muted/80",
          !active && !complete && "cursor-not-allowed text-muted-foreground opacity-70",
        );

        const content = (
          <>
            <span className="mr-2 text-xs tabular-nums">{index + 1}</span>
            {step.label}
          </>
        );

        if (!unlocked) {
          return (
            <span
              key={step.value}
              className={className}
              aria-disabled="true"
              title="完成前一步后可查看"
            >
              {content}
            </span>
          );
        }

        return (
          <a
            key={step.value}
            href={`#${step.targetId}`}
            className={className}
            aria-current={active ? "step" : undefined}
          >
            {content}
          </a>
        );
      })}
    </nav>
  );
}
