export function clampText(
  text: string,
  maxChars: number,
  options?: { trailingEllipsis?: boolean },
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  const sliced = text.slice(0, maxChars);
  return {
    text: options?.trailingEllipsis ? `${sliced}\n…` : sliced,
    truncated: true,
  };
}
