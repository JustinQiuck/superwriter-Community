// apps/web/extensions/typewriter-mode-extension.ts
// 打字机模式：每次光标移动后，将当前行滚动到编辑器视口垂直居中
// 原理：监听 ProseMirror transaction，在 selection 变化时计算光标 DOM 位置并 scroll
// 直接读取全局 store，避免通过 options 传递导致响应性问题
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useUIStore } from "@/stores/ui-store";

const typewriterPluginKey = new PluginKey("typewriter-mode");

export const TypewriterModeExtension = Extension.create({
  name: "typewriterMode",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: typewriterPluginKey,
        view() {
          return {
            update(view, prevState) {
              // 从全局 store 读取专注模式状态，避免 React 状态同步延迟
              const enabled = useUIStore.getState().focusMode;
              if (!enabled) return;

              // selection 未变化则跳过，避免无效滚动
              if (view.state.selection.eq(prevState.selection)) return;

              const { from } = view.state.selection;
              const domAtPos = view.domAtPos(from);
              if (!domAtPos.node) return;

              // 获取光标所在 DOM 节点（处理文本节点情况）
              let node = domAtPos.node as HTMLElement;
              if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentElement as HTMLElement;
              }
              if (!node) return;

              // 计算节点相对于可滚动容器的位置，滚动使其垂直居中
              const scrollContainer = view.dom.parentElement;
              if (!scrollContainer) return;

              const rect = node.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              const targetScrollTop =
                scrollContainer.scrollTop +
                (rect.top - containerRect.top) -
                containerRect.height / 2 +
                rect.height / 2;

              scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior: "smooth",
              });
            },
          };
        },
      }),
    ];
  },
});
