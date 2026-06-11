"use client";

import { use } from "react";
import { EntityPage } from "@/components/entities/entity-page";

export default function LocationsPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  return <EntityPage storyId={storyId} type="location" />;
}
