"use client";

import { useState, useEffect, useCallback } from "react";
import type { Entity } from "@/types/entity";
import type { EntityType } from "@superwriter/shared";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import { EntityList } from "@/components/entities/entity-list";
import { EntityForm } from "@/components/entities/entity-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface EntityPageProps {
  storyId: string;
  type: EntityType;
}

export function EntityPage({ storyId, type }: EntityPageProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/stories/${storyId}/entities?type=${type}`,
      );
      const json = await res.json();
      setEntities(json.data ?? []);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [storyId, type]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleCreate = async (data: {
    name: string;
    data: Record<string, unknown>;
    tags: string[];
  }) => {
    const res = await fetch(`/api/stories/${storyId}/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type }),
    });

    if (!res.ok) throw new Error("创建失败");
    const entity = await res.json();
    setEntities((prev) => [...prev, entity.data]);
    toast.success(`已创建「${data.name}」`);
  };

  const handleUpdate = async (data: {
    name: string;
    data: Record<string, unknown>;
    tags: string[];
  }) => {
    if (!editingEntity) return;

    const res = await fetch(
      `/api/stories/${storyId}/entities/${editingEntity.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!res.ok) throw new Error("更新失败");
    const updated = await res.json();
    setEntities((prev) =>
      prev.map((e) => (e.id === editingEntity.id ? updated.data : e)),
    );
    toast.success(`已更新「${data.name}」`);
    setEditingEntity(null);
  };

  const handleDelete = async (entity: Entity) => {
    if (!confirm(`确定要删除「${entity.name}」吗？`)) return;

    const res = await fetch(
      `/api/stories/${storyId}/entities/${entity.id}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      toast.error("删除失败");
      return;
    }

    setEntities((prev) => prev.filter((e) => e.id !== entity.id));
    toast.success(`已删除「${entity.name}」`);
  };

  const handleSelect = (entity: Entity) => {
    setEditingEntity(entity);
    setFormOpen(true);
  };

  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {ENTITY_TYPE_LABELS[type]}
          </h1>
          <p className="text-muted-foreground">
            {entities.length} 个{ENTITY_TYPE_LABELS[type]}
          </p>
        </div>
        <Button onClick={() => {
          setEditingEntity(null);
          setFormOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新建{ENTITY_TYPE_LABELS[type]}
        </Button>
      </div>

      <div className="mb-6 flex max-w-sm items-center relative">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="搜索名称或标签..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : (
        <EntityList
          entities={filteredEntities}
          emptyMessage={
            searchQuery
              ? "没有找到匹配的实体"
              : `还没有${ENTITY_TYPE_LABELS[type]}，点击新建开始`
          }
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      )}

      <EntityForm
        key={editingEntity?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEntity(null);
        }}
        type={type}
        initialData={
          editingEntity
            ? { name: editingEntity.name, data: editingEntity.data as Record<string, unknown>, tags: editingEntity.tags }
            : undefined
        }
        onSubmit={editingEntity ? handleUpdate : handleCreate}
      />
    </div>
  );
}
