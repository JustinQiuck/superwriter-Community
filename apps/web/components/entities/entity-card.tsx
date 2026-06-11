"use client";

import type { Entity } from "@/types/entity";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntityCardProps {
  entity: Entity;
  onSelect?: (entity: Entity) => void;
  onDelete?: (entity: Entity) => void;
}

export function EntityCard({ entity, onSelect, onDelete }: EntityCardProps) {
  const description = getEntityDescription(entity);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect?.(entity)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="line-clamp-1 text-base">{entity.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {ENTITY_TYPE_LABELS[entity.type]}
          </Badge>
        </div>
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entity);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">暂无描述</p>
        )}
        {entity.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entity.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {entity.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{entity.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getEntityDescription(entity: Entity) {
  const data = entity.data as Record<string, unknown>;
  const structuredDescription =
    typeof data.description === "string" ? data.description.trim() : "";

  return entity.ai_context?.trim() || structuredDescription;
}
