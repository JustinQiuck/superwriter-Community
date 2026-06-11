"use client";

import { useState } from "react";
import type { Entity } from "@/types/entity";
import { EntityCard } from "./entity-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface EntityListProps {
  entities: Entity[];
  emptyMessage?: string;
  onSelect?: (entity: Entity) => void;
  onDelete?: (entity: Entity) => void;
}

export function EntityList({
  entities,
  emptyMessage = "暂无数据",
  onSelect,
  onDelete,
}: EntityListProps) {
  const [search, setSearch] = useState("");

  const filtered = entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {search ? "没有匹配的结果" : emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
