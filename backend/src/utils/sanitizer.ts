/**
 * Sanitizes input strings by stripping script and HTML tags to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "");
}
