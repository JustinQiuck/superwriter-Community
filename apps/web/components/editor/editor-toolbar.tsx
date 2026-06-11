"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor;
}

const toolbarGroups = [
  [
    {
      icon: Bold,
      label: "粗体",
      action: (editor: Editor) => editor.chain().focus().toggleBold().run(),
      isActive: (editor: Editor) => editor.isActive("bold"),
    },
    {
      icon: Italic,
      label: "斜体",
      action: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
      isActive: (editor: Editor) => editor.isActive("italic"),
    },
    {
      icon: Strikethrough,
      label: "删除线",
      action: (editor: Editor) =>
        editor.chain().focus().toggleStrike().run(),
      isActive: (editor: Editor) => editor.isActive("strike"),
    },
    {
      icon: Code,
      label: "代码",
      action: (editor: Editor) =>
        editor.chain().focus().toggleCodeBlock().run(),
      isActive: (editor: Editor) => editor.isActive("codeBlock"),
    },
  ],
  [
    {
      icon: Heading1,
      label: "标题1",
      action: (editor: Editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: (editor: Editor) =>
        editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      label: "标题2",
      action: (editor: Editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (editor: Editor) =>
        editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      label: "标题3",
      action: (editor: Editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (editor: Editor) =>
        editor.isActive("heading", { level: 3 }),
    },
  ],
  [
    {
      icon: List,
      label: "无序列表",
      action: (editor: Editor) =>
        editor.chain().focus().toggleBulletList().run(),
      isActive: (editor: Editor) => editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "有序列表",
      action: (editor: Editor) =>
        editor.chain().focus().toggleOrderedList().run(),
      isActive: (editor: Editor) => editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      label: "引用",
      action: (editor: Editor) =>
        editor.chain().focus().toggleBlockquote().run(),
      isActive: (editor: Editor) => editor.isActive("blockquote"),
    },
    {
      icon: Minus,
      label: "分割线",
      action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
    },
  ],
  [
    {
      icon: Undo,
      label: "撤销",
      action: (editor: Editor) => editor.chain().focus().undo().run(),
      isActive: () => false,
    },
    {
      icon: Redo,
      label: "重做",
      action: (editor: Editor) => editor.chain().focus().redo().run(),
      isActive: () => false,
    },
  ],
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 border-b border-workspace-border/60 bg-workspace-paper/82 px-3 py-2">
      {toolbarGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Separator orientation="vertical" className="mx-1 h-6" />}
          {group.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  variant={item.isActive(editor) ? "secondary" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 rounded-xl ${
                    item.isActive(editor)
                      ? "bg-[var(--workspace-accent)]/10 text-[var(--workspace-accent)]"
                      : "text-muted-foreground hover:bg-workspace-muted hover:text-foreground"
                  }`}
                  onClick={() => item.action(editor)}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
