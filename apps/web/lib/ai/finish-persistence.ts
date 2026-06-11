type PersistenceResult = {
  error?: unknown;
} | null | undefined | void;

export async function logAIFinishPersistence(
  table: string,
  operation: PromiseLike<PersistenceResult>,
): Promise<boolean> {
  try {
    const result = await operation;
    if (result && typeof result === "object" && "error" in result && result.error) {
      console.error("AI finish persistence failed", {
        table,
        error: result.error,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("AI finish persistence failed", {
      table,
      error,
    });
    return false;
  }
}
