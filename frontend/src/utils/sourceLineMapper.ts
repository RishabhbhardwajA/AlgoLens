/**
 * Options for pattern-based source line resolution.
 */
export interface ResolveLineOptions {
  /** 1-indexed fallback line number if pattern cannot be resolved. Defaults to 0 (no highlight). */
  fallbackLine?: number;
  /** 1-indexed occurrence count to match (e.g. 2 for second instance of a statement). Defaults to 1. */
  occurrence?: number;
  /** Line number after which to begin matching. Useful for scoped search. */
  afterLine?: number;
  /** Whether to ignore single-line and block comment lines when matching code. Defaults to true. */
  ignoreComments?: boolean;
  /** If true, throws SourceLineNotFoundError instead of returning fallback when pattern is missing. */
  strict?: boolean;
}

export class SourceLineNotFoundError extends Error {
  constructor(pattern: string | RegExp) {
    super(`Source line mapping failed: Pattern ${String(pattern)} could not be located in source code.`);
    this.name = "SourceLineNotFoundError";
  }
}

/**
 * Resolves the 1-indexed line number in sourceCode matching a given substring or RegExp.
 *
 * NOTE ON ARCHITECTURE & LIMITATION:
 * AlgoLens uses pattern-based statement matching against the source text rather than
 * full AST compiler sourcemaps. This provides robust compensation for line shifts
 * caused by inserted comments, blank lines, and docstrings without requiring a full Babel/TypeScript
 * compiler in the runtime client. However, if a statement is completely renamed or edited,
 * the pattern will fail and either throw (in strict mode) or fall back safely to fallbackLine (or 0).
 */
export function resolveSourceLine(
  sourceCode: string | undefined | null,
  pattern: string | RegExp,
  fallbackOrOptions: number | ResolveLineOptions = 0
): number {
  const options: ResolveLineOptions =
    typeof fallbackOrOptions === "number"
      ? { fallbackLine: fallbackOrOptions, ignoreComments: true, occurrence: 1 }
      : { ignoreComments: true, occurrence: 1, fallbackLine: 0, ...fallbackOrOptions };

  const fallback = options.fallbackLine ?? 0;

  if (!sourceCode) {
    if (options.strict) throw new SourceLineNotFoundError(pattern);
    return fallback;
  }

  const targetOccurrence = options.occurrence && options.occurrence > 0 ? options.occurrence : 1;
  const startIdx = options.afterLine && options.afterLine > 0 ? options.afterLine : 0;
  const shouldIgnoreComments = options.ignoreComments !== false;

  const lines = sourceCode.split("\n");
  let matchCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (i < startIdx) continue;

    const line = lines[i];
    const trimmed = line.trim();

    // Skip comment lines if ignoreComments is true and pattern is not explicitly matching a comment
    if (shouldIgnoreComments) {
      const isComment =
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--");
      const patternIsComment =
        typeof pattern === "string" ? pattern.includes("//") || pattern.includes("/*") : false;

      if (isComment && !patternIsComment) {
        continue;
      }
    }

    let isMatch = false;
    if (typeof pattern === "string") {
      isMatch = line.includes(pattern);
    } else {
      isMatch = pattern.test(line);
    }

    if (isMatch) {
      matchCount++;
      if (matchCount === targetOccurrence) {
        return i + 1;
      }
    }
  }

  if (options.strict) {
    throw new SourceLineNotFoundError(pattern);
  }

  return fallback;
}

/**
 * Safely extracts the source code string from a VisualizableAlgorithm's sourceCode definition.
 */
export function getAlgorithmSource(
  sourceCode: string | Record<string, string> | undefined | null,
  language = "typescript"
): string {
  if (!sourceCode) return "";
  if (typeof sourceCode === "string") return sourceCode;
  return sourceCode[language] || sourceCode["typescript"] || Object.values(sourceCode)[0] || "";
}
