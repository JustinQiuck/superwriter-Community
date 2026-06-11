import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { MentionList, type MentionItem } from "@/components/editor/mention-list";
import type { SuggestionProps } from "@tiptap/suggestion";

// 通用 suggestion 配置工厂
function createSuggestion(
  storyId: string,
  entityType: "character" | "location"
) {
  return {
    char: entityType === "character" ? "@" : "#",
    items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/entities?type=${entityType}`
        );
        if (!res.ok) return [];
        const { data } = await res.json();
        const filtered = (data as { id: string; name: string }[])
          .filter((e) =>
            e.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 8);
        return filtered.map((e) => ({
          id: e.id,
          label: e.name,
          type: entityType,
        }));
      } catch {
        return [];
      }
    },
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate: (props: SuggestionProps) => {
          component?.updateProps(props);
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          // 转发给 MentionList 处理方向键/回车
          return (component?.ref as { onKeyDown?: (p: { event: KeyboardEvent }) => boolean })
            ?.onKeyDown?.(props) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

// 角色 Mention 扩展（@ 触发）
export function createCharacterMentionExtension(storyId: string) {
  return Mention.extend({
    name: "characterMention",
  }).configure({
    HTMLAttributes: {
      class: "mention-character",
    },
    renderLabel: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    suggestion: createSuggestion(storyId, "character"),
  });
}

// 地点 Mention 扩展（# 触发）
export function createLocationMentionExtension(storyId: string) {
  return Mention.extend({
    name: "locationMention",
  }).configure({
    HTMLAttributes: {
      class: "mention-location",
    },
    renderLabel: ({ node }) => `#${node.attrs.label ?? node.attrs.id}`,
    suggestion: createSuggestion(storyId, "location"),
  });
}
