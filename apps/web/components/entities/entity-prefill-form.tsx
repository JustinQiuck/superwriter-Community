"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EntityType } from "@superwriter/shared";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import { EntityForm } from "@/components/entities/entity-form";
import { toast } from "sonner";

interface EntityPrefillFormProps {
  storyId: string;
  type: EntityType;
  initialName: string;
}

export function EntityPrefillForm({
  storyId,
  type,
  initialName,
}: EntityPrefillFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      router.back();
    }
  };

  const handleCreate = async (data: {
    name: string;
    data: Record<string, unknown>;
    tags: string[];
  }) => {
    const response = await fetch(`/api/stories/${storyId}/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type }),
    });

    if (!response.ok) {
      throw new Error("创建失败");
    }

    toast.success(`已创建${ENTITY_TYPE_LABELS[type]}「${data.name}」`);
    router.back();
  };

  return (
    <EntityForm
      open={open}
      onOpenChange={handleOpenChange}
      type={type}
      initialName={initialName}
      onSubmit={handleCreate}
    />
  );
}
