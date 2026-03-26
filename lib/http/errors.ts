export type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

export function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const status = (error as StatusError).status;
    if (typeof status === "number") {
      return status;
    }
    const metadataStatus = (error as StatusError).$metadata?.httpStatusCode;
    if (typeof metadataStatus === "number") {
      return metadataStatus;
    }
  }
  return undefined;
}

export function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return undefined;
}
