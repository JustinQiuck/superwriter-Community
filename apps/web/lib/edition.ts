type EditionEnv = Record<string, string | undefined>;

export type SuperWriterEdition = "community" | "commercial";

export function getSuperWriterEdition(
  env: EditionEnv = process.env,
): SuperWriterEdition {
  return env.NEXT_PUBLIC_SUPERWRITER_EDITION === "commercial"
    ? "commercial"
    : "community";
}

export function isCommunityEdition(env: EditionEnv = process.env): boolean {
  return getSuperWriterEdition(env) === "community";
}

export function isAdminEnabled(env: EditionEnv = process.env): boolean {
  return (
    getSuperWriterEdition(env) === "commercial" &&
    env.SUPERWRITER_ENABLE_ADMIN === "true"
  );
}

export function getCommunityUrl(env: EditionEnv = process.env): string | null {
  const value = env.NEXT_PUBLIC_COMMUNITY_URL?.trim();
  return value ? value : null;
}
