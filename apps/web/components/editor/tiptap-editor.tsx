"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useState } from "react";
import { EditorToolbar } from "./editor-toolbar";
import { EditorStatusBar } from "./editor-status-bar";
import { MarkdownExtension } from "@/extensions/markdown-extension";
import { WordCountExtension } from "@/extensions/word-count-extension";
import { TypewriterModeExtension } from "@/extensions/typewriter-mode-extension";
import {
  createCharacterMentionExtension,
  createLocationMentionExtension,
} from "@/extensions/entity-mention-extension";
import { AICompletionExtension } from "@/extensions/ai-completion-extension";
import { AIFloatingMenu } from "./ai-floating-menu";
import { useWritingSession } from "@/hooks/use-writing-session";
import { useWritingFocus } from "@/stores/writing-focus-store";
import type { AIApplyRequest, AIEditorDraft, CursorContext } from "@/types/ai";
import { resolveAIApplyTarget } from "@/lib/editor/ai-apply-target";
import { toast } from "sonner";

interface TiptapEditorProps {
  content?: string;
  onUpdate?: (html: string) => void;
  onSave?: (html: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  storyId?: string;
  chapterId?: string;
  aiProvider?: string;
  aiModel?: string;
  onAIDraftGenerated?: (draft: AIEditorDraft) => void;
  aiApplyRequest?: AIApplyRequest | null;
  onAIApplyHandled?: (requestId: string, applied: boolean) => void;
}

export function TiptapEditor({
  content = "",
  onUpdate,
  onSave,
  placeholder = "开始写作...",
  className,
  autoFocus = false,
  storyId,
  chapterId,
  aiProvider = "anthropic",
  aiModel,
  onAIDraftGenerated,
  aiApplyRequest,
  onAIApplyHandled,
}: TiptapEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );

  const { updateContent } = useWritingSession(storyId ?? "", content);
  const setEditorFocus = useWritingFocus((state) => state.setEditorFocus);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      MarkdownExtension,
      WordCountExtension,
      TypewriterModeExtension,
      ...(storyId
        ? [
            createCharacterMentionExtension(storyId),
            createLocationMentionExtension(storyId),
	            AICompletionExtension.configure({
	              storyId,
	              chapterId,
	              // Passive autocomplete is disabled until the UI has an explicit opt-in and visible credit preview.
	              enabled: true,
	              provider: aiProvider,
	              model: aiModel,
	            }),
          ]
        : []),
    ],
    content,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[520px]",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("unsaved");
      const currentHTML = editor.getHTML();
      onUpdate?.(currentHTML);
      updateContent(editor.getText());
    },
  });
  const editorHTML = editor?.getHTML();

  const buildCursorContext = useCallback((): CursorContext | null => {
    if (!editor) return null;

    const { from } = editor.state.selection;
    const doc = editor.state.doc;
    const windowSize = 800;
    const before = doc.textBetween(Math.max(0, from - windowSize), from, "\n");
    const after = doc.textBetween(from, Math.min(doc.content.size, from + windowSize), "\n");
    const currentParagraph = editor.state.selection.$from.parent.textContent;

    return { before, after, currentParagraph };
  }, [editor]);

  useEffect(() => {
    if (!editor || !chapterId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleFocusUpdate = () => {
      if (timer) return;

      timer = setTimeout(() => {
        timer = null;
        const cursorContext = buildCursorContext();
        if (cursorContext) {
          setEditorFocus(chapterId, cursorContext);
        }
      }, 2000);
    };

    editor.on("selectionUpdate", scheduleFocusUpdate);
    editor.on("update", scheduleFocusUpdate);
    scheduleFocusUpdate();

    return () => {
      editor.off("selectionUpdate", scheduleFocusUpdate);
      editor.off("update", scheduleFocusUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [buildCursorContext, chapterId, editor, setEditorFocus]);

  useEffect(() => {
    if (!editor || !onSave) return;

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      onSave(editor.getHTML());
      setSaveStatus("saved");
    }, 500);

    return () => clearTimeout(timer);
  }, [editorHTML, onSave, editor]);

  useEffect(() => {
    if (!editor || !aiApplyRequest) return;
    if (
      aiApplyRequest.chapterId &&
      chapterId &&
      aiApplyRequest.chapterId !== chapterId
    ) {
      onAIApplyHandled?.(aiApplyRequest.id, false);
      return;
    }

    const applyTarget = resolveAIApplyTarget({
      mode: aiApplyRequest.mode,
      selection: aiApplyRequest.selection,
      contentSize: editor.state.doc.content.size,
      getTextBetween: (from, to) => editor.state.doc.textBetween(from, to, "\n"),
    });

    if (aiApplyRequest.mode === "replace") {
      if (!applyTarget.ok || !applyTarget.bounds) {
        toast.error("原选区已变化，请重新选择文本后再替换");
        onAIApplyHandled?.(aiApplyRequest.id, false);
        return;
      }

      editor
        .chain()
        .focus()
        .setTextSelection(applyTarget.bounds)
        .insertContent(aiApplyRequest.text)
        .run();
    } else if (aiApplyRequest.mode === "append") {
      if (!applyTarget.ok || !applyTarget.bounds) {
        toast.error("原选区已变化，请重新选择文本后再追加");
        onAIApplyHandled?.(aiApplyRequest.id, false);
        return;
      }

      editor
        .chain()
        .focus()
        .setTextSelection(applyTarget.bounds.to)
        .insertContent(`\n\n${aiApplyRequest.text}`)
        .run();
    } else {
      editor.chain().focus().insertContent(aiApplyRequest.text).run();
    }

    onAIApplyHandled?.(aiApplyRequest.id, true);
  }, [aiApplyRequest, chapterId, editor, onAIApplyHandled]);

  const handleSave = useCallback(() => {
    if (!editor || !onSave) return;
    setSaveStatus("saving");
    onSave(editor.getHTML());
    setSaveStatus("saved");
  }, [editor, onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (!editor) return null;

  return (
    <div className={`studio-manuscript flex h-full flex-col ${className ?? ""}`}>
      <div className="print:hidden">
        <EditorToolbar editor={editor} />
      </div>
      <div className="flex-1 overflow-auto print:h-auto print:overflow-visible">
        {storyId && editor && (
          <div className="print:hidden">
            <AIFloatingMenu
              editor={editor}
              storyId={storyId}
              chapterId={chapterId}
              aiProvider={aiProvider}
              aiModel={aiModel}
              onDraftGenerated={onAIDraftGenerated}
            />
          </div>
        )}
        <EditorContent editor={editor} className="print:m-0 print:p-0" />
      </div>
      <div className="print:hidden">
        <EditorStatusBar editor={editor} saveStatus={saveStatus} />
      </div>
    </div>
  );
}
