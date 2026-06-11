"use client";

import type { OutlineNode } from "@/lib/blueprint/workflow-types";
import {
  createOutlineNode,
  moveOutlineSibling,
  normalizeOutlineOrder,
} from "@/lib/blueprint/outline-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

const FUNCTION_OPTIONS: Array<{ value: OutlineNode["function"]; label: string }> = [
  { value: "setup", label: "建立" },
  { value: "complication", label: "复杂化" },
  { value: "turn", label: "转折" },
  { value: "crisis", label: "危机" },
  { value: "climax", label: "高潮" },
  { value: "resolution", label: "解决" },
  { value: "custom", label: "自定义" },
];

interface OutlineNodeEditorProps {
  node: OutlineNode;
  depth: number;
  index: number;
  siblingCount: number;
  onChange: (node: OutlineNode) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function OutlineNodeEditor({
  node,
  depth,
  index,
  siblingCount,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OutlineNodeEditorProps) {
  const updateChild = (childId: string, nextChild: OutlineNode) => {
    onChange({
      ...node,
      children: normalizeOutlineOrder(
        node.children.map((child) => (child.id === childId ? nextChild : child)),
      ),
    });
  };

  const deleteChild = (childId: string) => {
    onChange({
      ...node,
      children: normalizeOutlineOrder(
        node.children.filter((child) => child.id !== childId),
      ),
    });
  };

  const moveChild = (childIndex: number, direction: "up" | "down") => {
    onChange({
      ...node,
      children: moveOutlineSibling(node.children, childIndex, direction),
    });
  };

  const addChild = () => {
    const child = {
      ...createOutlineNode("新的子节点"),
      order: node.children.length,
    };

    onChange({
      ...node,
      children: normalizeOutlineOrder([...node.children, child]),
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 shadow-sm dark:bg-workspace-surface-strong",
        depth > 0 && "ml-4 border-dashed bg-workspace-paper/60 dark:bg-workspace-surface",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="grid flex-1 gap-3">
          <Input
            value={node.title}
            onChange={(event) =>
              onChange({ ...node, title: event.target.value })
            }
            placeholder="大纲节点标题"
          />
          <Textarea
            value={node.synopsis}
            onChange={(event) =>
              onChange({ ...node, synopsis: event.target.value })
            }
            placeholder="写下关键事件、冲突、转折、结果和读者期待。"
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-2 lg:w-64 lg:justify-end">
          <Select
            value={node.function}
            onValueChange={(value) =>
              onChange({ ...node, function: value as OutlineNode["function"] })
            }
          >
            <SelectTrigger className="h-9 w-[112px] bg-workspace-paper/70 dark:bg-workspace-surface-strong">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUNCTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0}
            title="上移"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveDown}
            disabled={index === siblingCount - 1}
            title="下移"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addChild}
            title="添加子节点"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onDelete}
            title="删除节点"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-4 space-y-3">
          {node.children.map((child, childIndex) => (
            <OutlineNodeEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIndex}
              siblingCount={node.children.length}
              onChange={(nextChild) => updateChild(child.id, nextChild)}
              onDelete={() => deleteChild(child.id)}
              onMoveUp={() => moveChild(childIndex, "up")}
              onMoveDown={() => moveChild(childIndex, "down")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
