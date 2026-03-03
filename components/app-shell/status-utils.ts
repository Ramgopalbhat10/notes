export type StatusDescriptor = {
  message: string;
  tone: "idle" | "info" | "warning" | "error";
  showLoader?: boolean;
};

export type StatusDescriptorInput = {
  status: string;
  dirty: boolean;
  lastSavedAt: string | null;
  error: string | null;
  conflictMessage: string | null;
  errorSource: "load" | "save" | null;
  hasFile: boolean;
};

export function buildStatusDescriptor({
  status,
  dirty,
  lastSavedAt,
  error,
  conflictMessage,
  errorSource,
  hasFile,
}: StatusDescriptorInput): StatusDescriptor | null {
  if (!hasFile) {
    return { message: "Select a file to begin", tone: "idle" };
  }

  if (status === "loading") {
    return { message: "Loading…", tone: "info", showLoader: true };
  }

  if (status === "saving") {
    return { message: "Saving…", tone: "info", showLoader: true };
  }

  if (status === "error") {
    const prefix = errorSource === "load" ? "Failed to load" : "Failed to save";
    const detail = error ? `: ${error}` : "";
    return { message: `${prefix}${detail}`, tone: "error" };
  }

  if (status === "conflict") {
    const detail = conflictMessage ? `: ${conflictMessage}` : "";
    return { message: `Save blocked by remote changes${detail}`, tone: "error" };
  }

  if (dirty) {
    return { message: "Unsaved changes", tone: "warning" };
  }

  const formatted = lastSavedAt ? formatTimestamp(lastSavedAt) : null;
  return { message: formatted ? `Saved • ${formatted}` : "Saved", tone: "idle" };
}

export function computeReadingTimeLabel(content: string, hasFile: boolean): string {
  if (!hasFile) {
    return "—";
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (!words) {
    return "< 1 min";
  }

  const minutes = words / 200;
  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} min`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)} hr`;
}

function formatTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const datePart = date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `${datePart} ${timePart}`;
}
