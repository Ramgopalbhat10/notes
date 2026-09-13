export function sanitizeContext(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const SENSITIVE_KEY_PATTERN =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|auth(?:orization)?|credential|session|cookie)\b/i;

const SENSITIVE_ASSIGNMENT_PATTERN =
  /^(\s*["']?[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|auth(?:orization)?|credential|session|cookie)[\w.-]*["']?\s*[:=]\s*)(.+)$/i;

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}\b/gi,
];

const PRIVATE_KEY_BLOCK_PATTERN =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;

export function redactSecrets(text: string): string {
  const redactedByLine = text
    .split("\n")
    .map((line) => {
      const assignmentMatch = line.match(SENSITIVE_ASSIGNMENT_PATTERN);
      if (assignmentMatch) {
        const [, prefix] = assignmentMatch;
        return `${prefix}[REDACTED]`;
      }

      if (!SENSITIVE_KEY_PATTERN.test(line)) {
        return line;
      }

      const eqIndex = line.indexOf("=");
      const colonIndex = line.indexOf(":");
      const splitIndex = eqIndex >= 0 && (colonIndex === -1 || eqIndex < colonIndex) ? eqIndex : colonIndex;
      if (splitIndex === -1) {
        return "[REDACTED]";
      }
      const prefix = line.slice(0, splitIndex + 1).trimEnd();
      return `${prefix} [REDACTED]`;
    })
    .join("\n");

  const redactedPrivateKeys = redactedByLine.replace(PRIVATE_KEY_BLOCK_PATTERN, "[REDACTED]");
  const redactedUrlCreds = redactedPrivateKeys.replace(/\/\/([^/\s:@]+):([^/\s@]+)@/g, "//[REDACTED]:[REDACTED]@");
  return SENSITIVE_VALUE_PATTERNS.reduce(
    (output, pattern) => output.replace(pattern, "[REDACTED]"),
    redactedUrlCreds,
  );
}
