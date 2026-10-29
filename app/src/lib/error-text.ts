// API errors keep an "HTTP 403 - " prefix for status checks in code; people see only the message.
export function errorText(error: unknown, fallback = ''): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.replace(/^HTTP \d+ - /, '') || fallback;
}
