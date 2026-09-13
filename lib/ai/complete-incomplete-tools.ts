import { isToolUIPart, type UIMessage } from "ai";

const INCOMPLETE_TOOL_STATES = new Set(["input-streaming", "input-available"]);

const INTERRUPTED_TOOL_ERROR = "Tool call was interrupted before a result was returned.";

function isIncompleteToolPart(part: UIMessage["parts"][number]): boolean {
  return isToolUIPart(part) && INCOMPLETE_TOOL_STATES.has(part.state);
}

export function hasIncompleteToolParts(messages: UIMessage[]): boolean {
  return messages.some((message) => (message.parts ?? []).some(isIncompleteToolPart));
}

export function completeIncompleteToolParts(
  messages: UIMessage[],
  errorText = INTERRUPTED_TOOL_ERROR,
): UIMessage[] {
  let changed = false;
  const next = messages.map((message) => {
    const parts = message.parts ?? [];
    if (!parts.some(isIncompleteToolPart)) {
      return message;
    }
    changed = true;
    return {
      ...message,
      parts: parts.map((part) => {
        if (!isIncompleteToolPart(part)) {
          return part;
        }
        return {
          ...part,
          state: "output-error",
          errorText,
        } as UIMessage["parts"][number];
      }),
    };
  });
  return changed ? next : messages;
}
