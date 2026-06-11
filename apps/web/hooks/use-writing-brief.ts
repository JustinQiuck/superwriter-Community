"use client";

import { useEffect, useState } from "react";

import type { WritingBrief } from "@/lib/writing/daily-writing-brief";

export function useWritingBrief(
  storyId: string,
  chapterId: string | null | undefined,
): { brief: WritingBrief | null; loading: boolean } {
  const [brief, setBrief] = useState<WritingBrief | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storyId || !chapterId) {
      setBrief(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/stories/${storyId}/writing-brief?chapterId=${encodeURIComponent(chapterId)}`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!controller.signal.aborted) {
          setBrief((json?.data as WritingBrief | undefined) ?? null);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBrief(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [storyId, chapterId]);

  return { brief, loading };
}
