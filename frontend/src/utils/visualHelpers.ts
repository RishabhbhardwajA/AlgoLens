import type { ArrayElement } from "@/engine/executionTypes";

/**
 * Ensures asymptotic complexity strings always render with a single outer O(...),
 * preventing double-wrapping such as "O(O(log n))".
 */
export function formatBigO(complexity: string | undefined | null): string {
  if (!complexity) return "O(?)";
  const trimmed = complexity.trim();
  if (/^O\(.*\)$/i.test(trimmed)) {
    return `O(${trimmed.slice(2, -1).trim()})`;
  }
  return `O(${trimmed})`;
}

/**
 * Computes monotonically scaled bar heights in [8, 100] (or [16, 100] when negatives exist)
 * so negative numbers are never distorted upward via Math.abs().
 */
export function computeBarHeights(elements: Array<Pick<ArrayElement, "value">>): number[] {
  const numericValues = elements.map((el) => Number(el.value));
  const finiteValues = numericValues.filter((v) => Number.isFinite(v));
  if (finiteValues.length === 0) {
    return elements.map(() => 10);
  }

  const minVal = Math.min(...finiteValues);
  const maxVal = Math.max(...finiteValues);

  if (minVal < 0) {
    const span = Math.max(maxVal - minVal, 1);
    return numericValues.map((v) => {
      if (!Number.isFinite(v)) return 10;
      return Math.round(((v - minVal) / span) * 84 + 16);
    });
  }

  const ceiling = Math.max(maxVal, 1);
  return numericValues.map((v) => {
    if (!Number.isFinite(v)) return 10;
    return Math.max(Math.round((v / ceiling) * 100), 8);
  });
}
