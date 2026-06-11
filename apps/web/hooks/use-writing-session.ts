"use client";
// apps/web/hooks/use-writing-session.ts
// 在编辑器挂载时开启写作会话，卸载时结算字数差并关闭会话
// 使用 keepalive 确保页面关闭时仍能完成最后一次 end 请求
import { useEffect, useRef } from "react";
import { countChineseAndEnglish } from "@/extensions/word-count-extension";

export function useWritingSession(storyId: string, initialContent: string) {
  const sessionIdRef = useRef<string | null>(null);
  const initialWordCountRef = useRef(countChineseAndEnglish(initialContent));
  // 用 ref 跟踪最新内容，避免 closure stale 问题
  const latestContentRef = useRef(initialContent);

  // 提供给外部更新最新内容的方法
  const updateContent = (content: string) => {
    latestContentRef.current = content;
  };

  useEffect(() => {
    let mounted = true;

    fetch(`/api/stories/${storyId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    })
      .then((r) => r.json())
      .then(({ data }) => {
        if (mounted && data?.id) {
          sessionIdRef.current = data.id;
          initialWordCountRef.current = countChineseAndEnglish(latestContentRef.current);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (!sessionIdRef.current) return;

      const currentCount = countChineseAndEnglish(latestContentRef.current);
      const diff = currentCount - initialWordCountRef.current;

      // keepalive 保证页面导航/关闭时请求仍能完成
      fetch(`/api/stories/${storyId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          sessionId: sessionIdRef.current,
          wordsWritten: Math.max(0, diff),
          wordsDeleted: Math.max(0, -diff),
        }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [storyId]); // 只在挂载/卸载时运行，storyId 变化重启会话

  return { updateContent };
}
