// apps/web/extensions/ai-completion-extension.ts
// 编辑器停止输入 800ms 后请求 AI 续写，以灰色 ghost 文字显示预览
// Tab 接受，Esc 拒绝，任意其他输入取消
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const aiCompletionKey = new PluginKey("ai-completion");

interface AICompletionOptions {
  storyId: string;
  chapterId?: string;
  enabled: boolean;
  provider?: string;
  model?: string;
}

export const AICompletionExtension = Extension.create<AICompletionOptions>({
  name: "aiCompletion",

	  addOptions() {
	    return { storyId: "", chapterId: undefined, enabled: false, provider: "anthropic", model: undefined };
	  },

  addProseMirrorPlugins() {
    const options = this.options;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let currentSuggestion = "";
    let abortController: AbortController | null = null;

    return [
      new Plugin({
        key: aiCompletionKey,
        state: {
          init: () => ({ suggestion: "", decorations: DecorationSet.empty }),
          apply(tr, prev) {
            // 清除之前的 decoration（用户有输入时）
            if (tr.docChanged && tr.getMeta("addingCompletion") !== true) {
              currentSuggestion = "";
              return { suggestion: "", decorations: DecorationSet.empty };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
          handleKeyDown(view, event) {
            const pluginState = aiCompletionKey.getState(view.state);
            if (!pluginState?.suggestion) return false;

            if (event.key === "Tab") {
              event.preventDefault();
              // 插入 suggestion 文字
              const { from } = view.state.selection;
              const tr = view.state.tr
                .insertText(pluginState.suggestion, from)
                .setMeta("addingCompletion", true);
              view.dispatch(tr);
              currentSuggestion = "";
              return true;
            }
            if (event.key === "Escape") {
              // 清除 suggestion
              view.dispatch(view.state.tr.setMeta("addingCompletion", false));
              currentSuggestion = "";
              return true;
            }
            return false;
          },
        },
        view(editorView) {
          return {
            update(view) {
              if (!options.enabled || !options.storyId) return;
              if (debounceTimer) clearTimeout(debounceTimer);
              abortController?.abort();

	              debounceTimer = setTimeout(async () => {
	                if (!options.enabled) return;
	                const { from } = view.state.selection;
                const text = view.state.doc.textBetween(
                  Math.max(0, from - 500),
                  from,
                  "\n"
                );
                if (text.trim().length < 20) return;

                abortController = new AbortController();
                try {
                  const res = await fetch("/api/ai/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      mode: "chapter_continue",
                      storyId: options.storyId,
                      chapterId: options.chapterId,
                      prompt: text,
                      provider: options.provider ?? "anthropic",
                      model: options.model,
                    }),
                    signal: abortController.signal,
                  });

                  if (!res.ok || !res.body) return;
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  let suggestion = "";

                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    // Vercel AI SDK data stream format: 0:"text"
                    const matches = chunk.matchAll(/^0:"(.*)"/gm);
                    for (const m of matches) {
                      suggestion += m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
                    }
                    if (suggestion.length > 150) break; // 最多预览 150 字
                  }

                  if (!suggestion.trim()) return;
                  currentSuggestion = suggestion.slice(0, 80); // 限制显示长度

                  // 创建 ghost text decoration
                  const curFrom = view.state.selection.from;
                  const decoration = Decoration.widget(curFrom, () => {
                    const span = document.createElement("span");
                    span.textContent = currentSuggestion;
                    span.style.cssText =
                      "color: #9ca3af; pointer-events: none; user-select: none;";
                    span.setAttribute("data-ai-completion", "true");
                    return span;
                  });
                  const decorationSet = DecorationSet.create(view.state.doc, [decoration]);
                  view.dispatch(
                    view.state.tr.setMeta(aiCompletionKey, {
                      suggestion: currentSuggestion,
                      decorations: decorationSet,
                    })
                  );
                } catch (e) {
                  if ((e as Error).name !== "AbortError") console.error(e);
                }
              }, 800);
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
              abortController?.abort();
            },
          };
        },
      }),
    ];
  },
});
