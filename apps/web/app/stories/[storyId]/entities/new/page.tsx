import { ENTITY_TYPES, type EntityType } from "@superwriter/shared";
import { EntityPrefillForm } from "@/components/entities/entity-prefill-form";

export default async function NewEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ type?: string; name?: string }>;
}) {
  const { storyId } = await params;
  const query = await searchParams;
  const type = ENTITY_TYPES.includes(query.type as EntityType)
    ? (query.type as EntityType)
    : "character";

  return (
    <EntityPrefillForm
      storyId={storyId}
      type={type}
      initialName={query.name ?? ""}
    />
  );
}
