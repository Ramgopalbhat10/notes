export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function extractResponseError(
  response: Response,
  fallback = "Request failed",
): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data === "object") {
      if ("error" in data && typeof data.error === "string") {
        return data.error;
      }
      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  } catch {
    // ignore parse errors
  }

  return response.statusText || fallback;
}

export async function parseJsonOrFallback<T>(
  response: Response,
  fallback: T,
): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
