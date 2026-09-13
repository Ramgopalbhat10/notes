export type ChatToolActivityState = "running" | "done" | "error";

export type ChatToolActivity = {
  id: string;
  toolName: string;
  state: ChatToolActivityState;
  label: string;
  openPath: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function hostnameFromUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function toolState(part: Record<string, unknown>): ChatToolActivityState {
  const state = asString(part.state);
  if (state === "output-error" || state === "error") {
    return "error";
  }
  if (state === "output-available" || state === "result") {
    return "done";
  }
  const output = part.output ?? part.result;
  if (output !== undefined) {
    const rec = asRecord(output);
    if (rec && rec.ok === false) {
      return "error";
    }
    return "done";
  }
  return "running";
}

function firstUrl(input: Record<string, unknown> | null): string | null {
  if (!input) {
    return null;
  }
  const urls = input.urls;
  if (Array.isArray(urls) && typeof urls[0] === "string") {
    return urls[0];
  }
  return asString(input.url);
}

function outputOk(output: unknown): boolean {
  const rec = asRecord(output);
  if (!rec) {
    return true;
  }
  if (rec.ok === false) {
    return false;
  }
  return true;
}

function survivingFilePath(toolName: string, input: Record<string, unknown> | null, output: unknown): string | null {
  if (toolName === "delete_path") {
    return null;
  }
  const out = asRecord(output);
  const fromOutput = asString(out?.path) ?? asString(out?.to);
  if (fromOutput && fromOutput.toLowerCase().endsWith(".md")) {
    return fromOutput;
  }
  const fromInput = asString(input?.path) ?? asString(input?.to);
  if (fromInput && fromInput.toLowerCase().endsWith(".md") && toolName !== "list_dir") {
    return fromInput;
  }
  return null;
}

function labelFor(
  toolName: string,
  state: ChatToolActivityState,
  input: Record<string, unknown> | null,
  output: unknown,
): string {
  const out = asRecord(output);
  const path = asString(out?.path) ?? asString(input?.path);
  const from = asString(out?.from) ?? asString(input?.from);
  const to = asString(out?.to) ?? asString(input?.to);
  const host = hostnameFromUrl(firstUrl(input));

  if (state === "running") {
    switch (toolName) {
      case "web_search":
        return "Searching the web…";
      case "web_extract":
        return host ? `Reading ${host}…` : "Reading page…";
      case "list_dir":
        return "Listing folder…";
      case "read_file":
        return path ? `Reading ${path}…` : "Reading file…";
      case "write_file":
        return path ? `Writing ${path}…` : "Writing file…";
      case "edit_file":
        return path ? `Editing ${path}…` : "Editing file…";
      case "create_folder":
        return "Creating folder…";
      case "delete_path":
        return "Deleting…";
      case "move_path":
        return "Moving…";
      case "list_versions":
        return "Listing versions…";
      case "rollback_file":
        return "Rolling back…";
      default:
        return `Running ${toolName}…`;
    }
  }

  const failed = state === "error" || !outputOk(output);
  const failPrefix = failed ? "Failed: " : "";

  switch (toolName) {
    case "web_search":
      return failed ? "Search failed" : "Searched the web";
    case "web_extract":
      return `${failPrefix}${host ? `Read ${host}` : "Read page"}`;
    case "list_dir":
      return `${failPrefix}Listed ${path || "vault root"}`;
    case "read_file":
      return `${failPrefix}Read ${path ?? "file"}`;
    case "write_file": {
      const created = out?.created === true;
      return `${failPrefix}${created ? "Created" : "Updated"} ${path ?? "file"}`;
    }
    case "edit_file":
      return `${failPrefix}Edited ${path ?? "file"}`;
    case "create_folder":
      return `${failPrefix}Created folder ${path ?? ""}`.trim();
    case "delete_path":
      return `${failPrefix}Deleted ${path ?? "path"}`;
    case "move_path":
      return `${failPrefix}Moved ${from ?? "path"} → ${to ?? "path"}`;
    case "list_versions":
      return `${failPrefix}Listed versions of ${path ?? "file"}`;
    case "rollback_file":
      return `${failPrefix}Rolled back ${path ?? "file"}`;
    default:
      return `${failPrefix}${toolName}`;
  }
}

export function extractToolName(part: Record<string, unknown>): string | null {
  const type = asString(part.type);
  if (!type) {
    return null;
  }
  if (type === "dynamic-tool") {
    return asString(part.toolName);
  }
  if (type === "tool-invocation") {
    const invocation = asRecord(part.toolInvocation);
    return asString(invocation?.toolName) ?? asString(invocation?.toolCallId);
  }
  if (
    type.startsWith("tool-") &&
    type !== "tool-call" &&
    type !== "tool-result" &&
    type !== "tool-invocation"
  ) {
    return type.slice("tool-".length);
  }
  return asString(part.toolName);
}

export function messageToToolActivities(message: { id?: string; parts?: unknown[] }): ChatToolActivity[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const activities: ChatToolActivity[] = [];

  parts.forEach((part, index) => {
    const rec = asRecord(part);
    if (!rec) {
      return;
    }
    const toolName = extractToolName(rec);
    if (!toolName) {
      return;
    }
    const input = asRecord(rec.input) ?? asRecord(rec.args) ?? asRecord(asRecord(rec.toolInvocation)?.args);
    const output = rec.output ?? rec.result ?? asRecord(rec.toolInvocation)?.result;
    const state = toolState(rec);
    const openPath = state === "done" && outputOk(output) ? survivingFilePath(toolName, input, output) : null;
    activities.push({
      id: `${message.id ?? "msg"}-${toolName}-${index}`,
      toolName,
      state,
      label: labelFor(toolName, state, input, output),
      openPath,
    });
  });

  return activities;
}

export type VaultMutationSummary = {
  writes: string[];
  edits: string[];
  rollbacks: string[];
  deletes: string[];
  moves: Array<{ from: string; to: string }>;
  created: string[];
};

function stringList(output: Record<string, unknown> | null, key: string): string | null {
  return asString(output?.[key]);
}

export function collectVaultMutations(messages: Array<{ parts?: unknown[] }>): VaultMutationSummary {
  const summary: VaultMutationSummary = {
    writes: [],
    edits: [],
    rollbacks: [],
    deletes: [],
    moves: [],
    created: [],
  };

  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      const rec = asRecord(part);
      if (!rec) {
        continue;
      }
      const toolName = extractToolName(rec);
      if (!toolName) {
        continue;
      }
      const output = asRecord(rec.output) ?? asRecord(rec.result);
      if (!output || output.ok === false) {
        continue;
      }
      if (toolState(rec) !== "done") {
        continue;
      }
      if (toolName === "write_file") {
        const path = stringList(output, "path");
        if (path) {
          summary.writes.push(path);
          if (output.created === true) {
            summary.created.push(path);
          }
        }
      } else if (toolName === "edit_file") {
        const path = stringList(output, "path");
        if (path) {
          summary.edits.push(path);
        }
      } else if (toolName === "rollback_file") {
        const path = stringList(output, "path");
        if (path) {
          summary.rollbacks.push(path);
        }
      } else if (toolName === "delete_path") {
        const path = stringList(output, "path");
        if (path) {
          summary.deletes.push(path);
        }
      } else if (toolName === "move_path") {
        const from = stringList(output, "from");
        const to = stringList(output, "to");
        if (from && to) {
          summary.moves.push({ from, to });
        }
      } else if (toolName === "create_folder") {
        const path = stringList(output, "path");
        if (path) {
          summary.created.push(path);
        }
      }
    }
  }

  return summary;
}

export function hasMutatingVaultActivity(summary: VaultMutationSummary): boolean {
  return (
    summary.writes.length > 0 ||
    summary.edits.length > 0 ||
    summary.rollbacks.length > 0 ||
    summary.deletes.length > 0 ||
    summary.moves.length > 0 ||
    summary.created.length > 0
  );
}

export function toastForMutations(summary: VaultMutationSummary): { title: string; description?: string } | null {
  if (!hasMutatingVaultActivity(summary)) {
    return null;
  }
  if (summary.deletes.length === 1 && summary.writes.length + summary.edits.length + summary.moves.length === 0) {
    return { title: `Deleted ${summary.deletes[0]}` };
  }
  if (summary.moves.length === 1 && summary.writes.length + summary.edits.length + summary.deletes.length === 0) {
    return { title: `Moved ${summary.moves[0].from} → ${summary.moves[0].to}` };
  }
  if (summary.created.length === 1 && summary.edits.length === 0 && summary.deletes.length === 0 && summary.moves.length === 0) {
    return { title: `Created ${summary.created[0]}` };
  }
  if (summary.edits.length === 1 && summary.writes.length === 0) {
    return { title: `Updated ${summary.edits[0]}` };
  }
  if (summary.writes.length === 1 && summary.created.length === 0) {
    return { title: `Updated ${summary.writes[0]}` };
  }
  if (summary.rollbacks.length === 1) {
    return { title: `Rolled back ${summary.rollbacks[0]}` };
  }
  return { title: "Vault updated", description: "Chat applied changes to the vault." };
}
