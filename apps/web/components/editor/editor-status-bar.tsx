"use client";

import type { Editor } from "@tiptap/react";
import { countChineseAndEnglish } from "@/extensions/word-count-extension";

interface EditorStatusBarProps {
  editor: Editor;
  saveStatus: "saved" | "saving" | "unsaved";
}

export function EditorStatusBar({ editor, saveStatus }: EditorStatusBarProps) {
  // 从 CharacterCount 扩展读取字符总数
  const charCount =
    (editor.storage.characterCount as { characters?: () => number } | undefined)?.characters?.() ?? 0;
  // 中英文混合字数统计
  const wordCount = countChineseAndEnglish(editor.getText());

  const statusText = {
    saved: "已保存",
    saving: "保存中...",
    unsaved: "未保存",
  };

  const statusColor = {
    saved: "text-[var(--module-location)]",
    saving: "text-[var(--module-timeline)]",
    unsaved: "text-muted-foreground",
  };

  return (
    <div className="flex items-center justify-between border-t border-workspace-border/60 bg-workspace-paper/82 px-4 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>字数: {wordCount.toLocaleString()}</span>
        <span>字符: {charCount.toLocaleString()}</span>
      </div>
      <div>
        <span className={statusColor[saveStatus]}>
          {statusText[saveStatus]}
        </span>
      </div>
    </div>
  );
}
