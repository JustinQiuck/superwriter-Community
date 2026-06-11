"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";

interface EntityNodeData {
  label: string;
  entityType: string;
  color: string;
}

export const EntityNode = memo(({ data }: NodeProps) => {
  const { label, entityType, color } = data as unknown as EntityNodeData;
  return (
    <div
      className="rounded-lg border-2 shadow-sm min-w-[120px] text-center cursor-pointer select-none"
      style={{
        borderColor: color,
        background: `${color}18`,
        color,
        padding: "8px 12px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-0 !h-0"
      />
      <div style={{ fontSize: "10px", opacity: 0.65, marginBottom: "2px" }}>
        {ENTITY_TYPE_LABELS[entityType as keyof typeof ENTITY_TYPE_LABELS] ?? entityType}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600 }}>{label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-0 !h-0"
      />
    </div>
  );
});

EntityNode.displayName = "EntityNode";
