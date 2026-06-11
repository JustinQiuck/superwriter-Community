import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AICreditPreviewItem } from "@/hooks/use-ai-credit-preview";

export function AICreditBadge({
  preview,
  className,
}: {
  credits?: number;
  behavior?: "explicit" | "system_free" | "disabled";
  priceTier?: AICreditPreviewItem["priceTier"];
  loading?: boolean;
  preview?: AICreditPreviewItem;
  className?: string;
}) {
  const disabled = preview?.isDisabled ?? false;

  return (
    <Badge
      variant={disabled ? "destructive" : "outline"}
      className={cn("h-5 shrink-0 rounded-full px-2 text-[10px]", className)}
      title={preview?.configurationError?.message}
    >
      {disabled ? "暂不可用" : "个人 Key"}
    </Badge>
  );
}

export function creditCostLabel(): string {
  return "个人 Key";
}
