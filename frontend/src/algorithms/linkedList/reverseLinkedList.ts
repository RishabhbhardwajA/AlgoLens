import {
  type VisualizableAlgorithm,
  type VisualizationState,
  type LinkedListNodeState,
  type ExecutionStep,
} from "@/engine/executionTypes";
import { resetStepCounter, step, frame } from "@/engine/stepBuilder";

const REVERSE_SOURCE = {
  typescript: [
    "function reverseList(head: ListNode | null): ListNode | null {",
    "  let prev: ListNode | null = null;",
    "  let curr: ListNode | null = head;",
    "",
    "  while (curr !== null) {",
    "    const next = curr.next;",
    "    curr.next = prev;     // Reverse pointer",
    "    prev = curr;          // Advance prev",
    "    curr = next;          // Advance curr",
    "  }",
    "",
    "  return prev;            // New head of reversed list",
    "}",
  ].join("\n"),

  python: [
    "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:",
    "    prev = None",
    "    curr = head",
    "",
    "    while curr:",
    "        nxt = curr.next",
    "        curr.next = prev   # Reverse pointer",
    "        prev = curr        # Advance prev",
    "        curr = nxt         # Advance curr",
    "",
    "    return prev",
  ].join("\n"),

  java: [
    "public ListNode reverseList(ListNode head) {",
    "    ListNode prev = null;",
    "    ListNode curr = head;",
    "",
    "    while (curr != null) {",
    "        ListNode next = curr.next;",
    "        curr.next = prev;  // Reverse pointer",
    "        prev = curr;       // Advance prev",
    "        curr = next;       // Advance curr",
    "    }",
    "",
    "    return prev;",
    "}",
  ].join("\n"),

  cpp: [
    "ListNode* reverseList(ListNode* head) {",
    "    ListNode* prev = nullptr;",
    "    ListNode* curr = head;",
    "",
    "    while (curr != nullptr) {",
    "        ListNode* next = curr->next;",
    "        curr->next = prev; // Reverse pointer",
    "        prev = curr;       // Advance prev",
    "        curr = next;       // Advance curr",
    "    }",
    "",
    "    return prev;",
    "}",
  ].join("\n"),
};

export const reverseLinkedList: VisualizableAlgorithm<number[]> = {
  id: "reverse-linked-list",
  name: "Reverse Linked List",
  category: "Linked List",
  difficulty: "Easy",
  description:
    "Reverse a singly-linked list in-place in O(n) time and O(1) auxiliary space by flipping pointers sequentially.",
  sourceCode: REVERSE_SOURCE,
  language: "typescript",

  parseInput(raw: unknown): number[] {
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      const sanitized = trimmed.startsWith("[") && trimmed.endsWith("]")
        ? trimmed.slice(1, -1)
        : trimmed;
      return sanitized
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
    }
    return [1, 2, 3, 4, 5];
  },

  validateInput(input: number[]): { valid: boolean; error?: string } {
    if (!Array.isArray(input) || input.length === 0) {
      return { valid: false, error: "Please enter at least one number." };
    }
    if (input.length > 8) {
      return { valid: false, error: "Please enter 8 or fewer numbers for optimal visualization." };
    }
    return { valid: true };
  },

  initialVisualizationState(input: number[]): VisualizationState {
    const nodes: LinkedListNodeState[] = input.map((val, idx) => ({
      id: String(idx + 1),
      value: val,
      state: "default",
      pointers: idx === 0 ? ["head"] : [],
      nextId: idx < input.length - 1 ? String(idx + 2) : null,
      isHead: idx === 0,
    }));

    return {
      type: "linked-list",
      nodes,
      pointers: { prev: null, curr: "1" },
    };
  },

  execute(input: number[]): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];
    const n = input.length;

    // Node objects tracking their next pointers
    const nodeIds = input.map((_, idx) => String(idx + 1));
    const nextPtrs: Record<string, string | null> = {};
    nodeIds.forEach((id, idx) => {
      nextPtrs[id] = idx < n - 1 ? nodeIds[idx + 1] : null;
    });

    function capture(
      prevId: string | null,
      currId: string | null,
      nextId: string | null
    ): VisualizationState {
      const nodes: LinkedListNodeState[] = input.map((val, idx) => {
        const id = nodeIds[idx];
        const ptrs: string[] = [];
        if (prevId === id) ptrs.push("prev");
        if (currId === id) ptrs.push("curr");
        if (nextId === id) ptrs.push("next");

        let state: LinkedListNodeState["state"] = "default";
        if (currId === id) state = "current";
        else if (prevId === id) state = "visited";

        return {
          id,
          value: val,
          state,
          pointers: ptrs,
          nextId: nextPtrs[id],
          isHead: prevId === null && currId === id,
        };
      });

      return {
        type: "linked-list",
        nodes,
        pointers: { prev: prevId, curr: currId, next: nextId },
      };
    }

    let prev: string | null = null;
    let curr: string | null = nodeIds[0] || null;

    // Line 2-3: Initialization
    steps.push(
      step()
        .line(2)
        .fn("reverseList")
        .event({
          type: "STEP",
          description: "Initialize prev = null, curr = head.",
          line: 2,
        })
        .callStack([frame("f0", "reverseList", { head: curr }, { prev: null, curr }, 2)])
        .variables({ prev: null, curr })
        .viz(capture(prev, curr, null))
        .explain("Initialized pointers: prev = null, curr points to head node.")
        .build()
    );

    let stepIndex = 0;
    while (curr !== null) {
      stepIndex++;
      const next: string | null = nextPtrs[curr] ?? null;

      // Line 5: while condition true
      steps.push(
        step()
          .line(5)
          .fn("reverseList")
          .event({
            type: "COMPARE",
            left: `Node(${curr})`,
            right: "null",
            operator: "!==",
            result: true,
            line: 5,
          })
          .callStack([frame("f0", "reverseList", {}, { prev, curr, next: null }, 5)])
          .variables({ prev, curr, next: null })
          .viz(capture(prev, curr, null))
          .explain(`curr (Node ${curr}) !== null. Loop continues.`)
          .build()
      );

      // Line 6: const next = curr.next;
      steps.push(
        step()
          .line(6)
          .fn("reverseList")
          .event({
            type: "POINTER_MOVE",
            pointer: "next",
            from: -1,
            to: next ? parseInt(next, 10) : -1,
            line: 6,
          })
          .callStack([frame("f0", "reverseList", {}, { prev, curr, next }, 6)])
          .variables({ prev, curr, next })
          .viz(capture(prev, curr, next))
          .explain(`Save next node: next = curr.next (Node ${next ?? "null"}). This prevents losing rest of the list.`)
          .build()
      );

      // Line 7: curr.next = prev; (POINTER REWIRING!)
      nextPtrs[curr] = prev;
      steps.push(
        step()
          .line(7)
          .fn("reverseList")
          .event({
            type: "UPDATE",
            variable: `Node(${curr}).next`,
            oldValue: next,
            newValue: prev,
            line: 7,
          })
          .callStack([frame("f0", "reverseList", {}, { prev, curr, next }, 7)])
          .variables({ prev, curr, next, "curr.next": prev })
          .viz(capture(prev, curr, next))
          .explain(`REVERSE POINTER: curr.next = prev. Node ${curr}'s arrow now flips to point backwards to ${prev ? `Node ${prev}` : "NULL"}!`)
          .build()
      );

      // Line 8: prev = curr;
      prev = curr;
      steps.push(
        step()
          .line(8)
          .fn("reverseList")
          .event({
            type: "POINTER_MOVE",
            pointer: "prev",
            from: -1,
            to: parseInt(prev, 10),
            line: 8,
          })
          .callStack([frame("f0", "reverseList", {}, { prev, curr, next }, 8)])
          .variables({ prev, curr, next })
          .viz(capture(prev, curr, next))
          .explain(`Advance prev: prev = curr (now at Node ${prev}).`)
          .build()
      );

      // Line 9: curr = next;
      curr = next;
      steps.push(
        step()
          .line(9)
          .fn("reverseList")
          .event({
            type: "POINTER_MOVE",
            pointer: "curr",
            from: parseInt(prev, 10),
            to: curr ? parseInt(curr, 10) : -1,
            line: 9,
          })
          .callStack([frame("f0", "reverseList", {}, { prev, curr, next }, 9)])
          .variables({ prev, curr, next })
          .viz(capture(prev, curr, null))
          .explain(`Advance curr: curr = next (${curr ? `Node ${curr}` : "null"}).`)
          .build()
      );
    }

    // Line 12: return prev;
    steps.push(
      step()
        .line(12)
        .fn("reverseList")
        .event({
          type: "RETURN",
          functionName: "reverseList",
          value: prev ? `Node(${prev})` : null,
          line: 12,
        })
        .callStack([])
        .variables({ returnHead: prev ? `Node(${prev})` : null })
        .viz(capture(prev, null, null))
        .returns(prev)
        .explain(`Reversal complete! Return prev (Node ${prev}) as the new head of the reversed list.`)
        .build()
    );

    return steps;
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "Each node is visited and its pointer flipped exactly once: linear O(n) time.",
    spaceDescription: "Three pointer variables (prev, curr, next) used in-place: constant O(1) space.",
  },

  visualizationType: "linked-list",
  defaultInput: "[1, 2, 3, 4, 5]",
  tags: ["linked-list", "two-pointer", "in-place", "pointers"],
};
