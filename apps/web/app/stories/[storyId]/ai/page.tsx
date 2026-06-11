"use client";

import { use, useEffect, useState } from "react";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";
import type { AIProvider } from "@superwriter/shared";

export default function AIPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
	  const [prefs, setPrefs] = useState<{
	    provider: string;
	    billingProvider: AIProvider;
	    model: string;
	  }>({ provider: "sw-free", billingProvider: "sw-free", model: "" });

  useEffect(() => {
    fetch("/api/profile/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
	          setPrefs({
	            provider: data.ai_provider_preference ?? "sw-free",
	            billingProvider: data.ai_billing_provider ?? "sw-free",
	            model: data.ai_model_preference ?? "",
	          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-full">
      <AIAssistantPanel
	        storyId={storyId}
	        aiProvider={prefs.provider}
	        aiBillingProvider={prefs.billingProvider}
	        aiModel={prefs.model}
	      />
    </div>
  );
}
