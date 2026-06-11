"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeviationReport, DeviationStatus } from "@/types/deviation";
import type { FocusPayload } from "@/types/ai";

interface UseDeviationNotificationsOptions {
  storyId: string;
  beatId?: string | null;
  focusPayload?: FocusPayload | null;
  pollInterval?: number;
}

export function useDeviationNotifications({
  storyId,
  beatId,
  focusPayload,
  pollInterval = 30000,
}: UseDeviationNotificationsOptions) {
  const [pendingDeviations, setPendingDeviations] = useState<DeviationReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status: "pending" });
      if (beatId) params.set("beatId", beatId);
      const res = await fetch(
        `/api/stories/${storyId}/deviations?${params.toString()}`,
      );
      if (res.ok) {
        const { data } = await res.json();
        setPendingDeviations(data ?? []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [beatId, storyId]);

  const updateStatus = useCallback(
    async (reportId: string, status: DeviationStatus) => {
      try {
        const res = await fetch(`/api/stories/${storyId}/deviations`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, status }),
        });
        if (res.ok) {
          setPendingDeviations((prev) =>
            prev.filter((d) => d.id !== reportId),
          );
      }
    } catch {
    }
  },
    [storyId],
  );

  const requestSuggestion = useCallback(
    async (report: DeviationReport) => {
      try {
        const res = await fetch("/api/ai/deviation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId,
            reportId: report.id,
            deviationType: report.deviationType,
            blueprintValue: report.blueprintValue,
            actualValue: report.actualValue,
            focusPayload,
          }),
        });
        if (res.ok) {
          const { data } = await res.json();
          return data?.suggestion ?? null;
      }
    } catch {
    }
    return null;
    },
    [focusPayload, storyId],
  );

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPending, pollInterval]);

  return {
    pendingDeviations,
    loading,
    updateStatus,
    requestSuggestion,
    refresh: fetchPending,
  };
}
