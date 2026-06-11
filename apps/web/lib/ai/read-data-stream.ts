export async function readTextFromDataStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  const appendLine = (line: string) => {
    const normalized = line.trimEnd();
    if (!normalized.startsWith("0:") && !normalized.startsWith("3:")) return;

    let payload: unknown;
    try {
      payload = JSON.parse(normalized.slice(2)) as unknown;
    } catch {
      // Ignore incomplete or non-text stream parts.
      return;
    }

    if (normalized.startsWith("3:") && typeof payload === "string") {
      throw new Error(payload);
    }
    if (typeof payload === "string") {
      result += payload;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      appendLine(line);
    }
  }

  if (buffer) {
    appendLine(buffer);
  }

  return result;
}
