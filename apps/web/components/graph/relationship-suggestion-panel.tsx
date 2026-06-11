"use client";

import { RELATIONSHIP_TYPE_LABELS } from "@superwriter/shared";
import type { Entity } from "@/types/entity";
import type { RelationshipSuggestion } from "@/lib/relationships/relationship-suggestions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";

interface RelationshipSuggestionPanelProps {
  entities: Entity[];
  suggestions: RelationshipSuggestion[];
  savingIds: Set<string>;
  onAccept: (suggestion: RelationshipSuggestion) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export function RelationshipSuggestionPanel({
  entities,
  suggestions,
  savingIds,
  onAccept,
  onAcceptAll,
  onDismiss,
}: RelationshipSuggestionPanelProps) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));

  if (suggestions.length === 0) return null;

  return (
    <aside className="absolute right-4 top-4 z-10 flex max-h-[calc(100%-2rem)] w-[360px] flex-col rounded-lg border bg-background/95 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 border-b p-3">
        <div>
          <h2 className="text-sm font-semibold">AI 关系候选</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            审核后写入关系图谱。
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="关闭关系候选"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <Badge variant="outline">{suggestions.length} 条候选</Badge>
        <Button type="button" size="sm" onClick={onAcceptAll}>
          <Check className="h-4 w-4" />
          全部接受
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {suggestions.map((suggestion) => {
            const fromEntity = entityById.get(suggestion.fromEntityId);
            const toEntity = entityById.get(suggestion.toEntityId);
            const fromName = fromEntity?.name ?? suggestion.fromEntityId;
            const toName = toEntity?.name ?? suggestion.toEntityId;

            return (
              <article
                key={suggestion.id}
                className="rounded-md border bg-workspace-paper/75 p-3 text-sm dark:bg-workspace-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      <span>{fromName}</span>
                      <span className="px-1 text-muted-foreground">→</span>
                      <span>{toName}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {RELATIONSHIP_TYPE_LABELS[suggestion.type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onAccept(suggestion)}
                    disabled={savingIds.has(suggestion.id)}
                    aria-label={`接受关系：${fromName} 到 ${toName}`}
                  >
                    {savingIds.has(suggestion.id) ? "保存中" : "接受"}
                  </Button>
                </div>
                {suggestion.description ? (
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {suggestion.description}
                  </p>
                ) : null}
                {suggestion.reason ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    依据：{suggestion.reason}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
