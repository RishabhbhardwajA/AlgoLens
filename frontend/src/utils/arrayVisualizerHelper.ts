import type {
  ArrayElement,
  ElementState,
  VisualizationState,
} from "../engine/executionTypes";

export interface BuildArrayVisualizationOptions {
  foundIndex?: number | null;
  useElimination?: boolean;
  shortLabels?: boolean;
}

/**
 * Unified DRY helper for building Array VisualizationState across trace adapters,
 * algorithm generators, and debugging catalogs.
 */
export function buildArrayVisualizationState(
  arr: (number | string)[],
  pointers: Record<string, number>,
  options?: BuildArrayVisualizationOptions
): VisualizationState {
  const foundIndex = options?.foundIndex ?? null;
  const left = pointers.left ?? pointers.low;
  const right = pointers.right ?? pointers.high;
  const useElimination =
    Boolean(options?.useElimination) && left !== undefined && right !== undefined;

  const elements: ArrayElement[] = arr.map((val, idx) => {
    let state: ElementState = "default";
    const matchingPointerNames: string[] = [];

    for (const [pName, pIdx] of Object.entries(pointers)) {
      if (pIdx === idx) {
        matchingPointerNames.push(pName);
      }
    }

    let label: string | undefined;

    if (foundIndex !== null && idx === foundIndex) {
      state = "found";
      label = "✓";
    } else if (useElimination && (idx < left! || idx > right!)) {
      state = "eliminated";
    } else if (matchingPointerNames.length > 0) {
      if (options?.shortLabels) {
        if (matchingPointerNames.some((n) => n === "mid")) {
          label = "mid";
        } else if (matchingPointerNames.some((n) => n === "left")) {
          label = "L";
        } else if (matchingPointerNames.some((n) => n === "right")) {
          label = "R";
        } else {
          label = matchingPointerNames.join(", ");
        }
      } else {
        label = matchingPointerNames.join(", ");
      }

      if (matchingPointerNames.some((n) => n.includes("mid"))) {
        state = "pointer-mid";
      } else if (matchingPointerNames.some((n) => n.includes("left") || n.includes("low"))) {
        state = "pointer-left";
      } else if (matchingPointerNames.some((n) => n.includes("right") || n.includes("high"))) {
        state = "pointer-right";
      } else {
        state = "current";
      }
    }

    return {
      value: val,
      index: idx,
      state,
      label,
    };
  });

  return {
    type: "array",
    elements,
    pointers,
  };
}
