import {
  type VisualizableAlgorithm,
  type VisualizationState,
  type LinkedListNodeState,
  type ExecutionStep,
} from "@/engine/executionTypes";
import { resetStepCounter, step, frame } from "@/engine/stepBuilder";

const CYCLE_SOURCE = {
  typescript: [
    "function hasCycle(head: ListNode | null): boolean {",
    "  if (!head || !head.next) return false;",
    "",
    "  let slow: ListNode | null = head;",
    "  let fast: ListNode | null = head;",
    "",
    "  while (fast !== null && fast.next !== null) {",
    "    slow = slow.next;         // Move 1 step",
    "    fast = fast.next.next;    // Move 2 steps",
    "",
    "    if (slow === fast) {",
    "      return true;            // Collision detected!",
    "    }",
    "  }",
    "",
    "  return false;               // Fast reached null (no cycle)",
    "}",
  ].join("\n"),

  python: [
    "def hasCycle(head: Optional[ListNode]) -> bool:",
    "    if not head or not head.next:",
    "        return False",
    "",
    "    slow, fast = head, head",
    "",
    "    while fast and fast.next:",
    "        slow = slow.next          # Move 1 step",
    "        fast = fast.next.next     # Move 2 steps",
    "",
    "        if slow == fast:",
    "            return True           # Collision detected!",
    "",
    "    return False",
  ].join("\n"),

  java: [
    "public boolean hasCycle(ListNode head) {",
    "    if (head == null || head.next == null) return false;",
    "",
    "    ListNode slow = head;",
    "    ListNode fast = head;",
    "",
    "    while (fast != null && fast.next != null) {",
    "        slow = slow.next;        // Move 1 step",
    "        fast = fast.next.next;   // Move 2 steps",
    "",
    "        if (slow == fast) {",
    "            return true;         // Collision detected!",
    "        }",
    "    }",
    "",
    "    return false;",
    "}",
  ].join("\n"),

  cpp: [
    "bool hasCycle(ListNode *head) {",
    "    if (!head || !head->next) return false;",
    "",
    "    ListNode *slow = head;",
    "    ListNode *fast = head;",
    "",
    "    while (fast != nullptr && fast->next != nullptr) {",
    "        slow = slow->next;       // Move 1 step",
    "        fast = fast->next->next; // Move 2 steps",
    "",
    "        if (slow == fast) {",
    "            return true;         // Collision detected!",
    "        }",
    "    }",
    "",
    "    return false;",
    "}",
  ].join("\n"),
};

export const detectCycle: VisualizableAlgorithm<number[]> = {
  id: "detect-cycle",
  name: "Linked List Cycle (Floyd's)",
  category: "Linked List",
  difficulty: "Easy",
  description:
    "Detect whether a linked list contains a cycle using Floyd's Tortoise and Hare (Slow & Fast pointer) algorithm in O(n) time and O(1) space.",
  sourceCode: CYCLE_SOURCE,
  language: "typescript",

  parseInput(raw: unknown): number[] {
    if (Array.isArray(raw)) return raw.map(Number);
    return [3, 2, 0, -4];
  },

  validateInput(input: number[]): { valid: boolean; error?: string } {
    if (!Array.isArray(input) || input.length < 2) {
      return { valid: false, error: "Please enter at least 2 numbers." };
    }
    return { valid: true };
  },

  initialVisualizationState(input: number[]): VisualizationState {
    const nodes: LinkedListNodeState[] = input.map((val, idx) => ({
      id: String(idx + 1),
      value: val,
      state: "default",
      pointers: idx === 0 ? ["head", "slow", "fast"] : [],
      nextId: idx < input.length - 1 ? String(idx + 2) : "2",
      isHead: idx === 0,
    }));

    return {
      type: "linked-list",
      nodes,
      cycleTargetId: "2",
      pointers: { slow: "1", fast: "1" },
    };
  },

  execute(input: number[]): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];
    const n = input.length;

    const nodeIds = input.map((_, idx) => String(idx + 1));
    // Simulate circular connection from last node back to node 2
    const cycleEntryIndex = 1; // index 1 is Node 2
    const cycleEntryId = nodeIds[cycleEntryIndex];

    const nextMap: Record<string, string> = {};
    for (let i = 0; i < n - 1; i++) {
      nextMap[nodeIds[i]] = nodeIds[i + 1];
    }
    nextMap[nodeIds[n - 1]] = cycleEntryId; // tail links to node 2

    function capture(slowId: string, fastId: string): VisualizationState {
      const nodes: LinkedListNodeState[] = input.map((val, idx) => {
        const id = nodeIds[idx];
        const ptrs: string[] = [];
        if (slowId === id) ptrs.push("slow");
        if (fastId === id) ptrs.push("fast");

        let state: LinkedListNodeState["state"] = "default";
        if (slowId === id && fastId === id) state = "found";
        else if (slowId === id) state = "pointer-left";
        else if (fastId === id) state = "pointer-right";

        return {
          id,
          value: val,
          state,
          pointers: ptrs,
          nextId: nextMap[id],
          isHead: id === "1",
        };
      });

      return {
        type: "linked-list",
        nodes,
        cycleTargetId: cycleEntryId,
        pointers: { slow: slowId, fast: fastId },
      };
    }

    let slow = nodeIds[0];
    let fast = nodeIds[0];

    // Initialization step
    steps.push(
      step()
        .line(4)
        .fn("hasCycle")
        .event({
          type: "STEP",
          description: "Initialize slow and fast pointers at head node.",
          line: 4,
        })
        .callStack([frame("f0", "hasCycle", { head: slow }, { slow, fast }, 4)])
        .variables({ slow, fast })
        .viz(capture(slow, fast))
        .explain("Initialized Floyd's algorithm: slow and fast both point to head (Node 1).")
        .build()
    );

    let round = 0;
    while (round < 15) {
      round++;

      // Condition check
      steps.push(
        step()
          .line(7)
          .fn("hasCycle")
          .event({
            type: "COMPARE",
            left: `fast(${fast})`,
            right: "null",
            operator: "!==",
            result: true,
            line: 7,
          })
          .callStack([frame("f0", "hasCycle", {}, { slow, fast }, 7)])
          .variables({ slow, fast, round })
          .viz(capture(slow, fast))
          .explain(`Iteration ${round}: fast pointer is valid. Advancing pointers.`)
          .build()
      );

      // Move slow 1 step
      const oldSlow = slow;
      slow = nextMap[slow];
      steps.push(
        step()
          .line(8)
          .fn("hasCycle")
          .event({
            type: "POINTER_MOVE",
            pointer: "slow",
            from: parseInt(oldSlow, 10),
            to: parseInt(slow, 10),
            line: 8,
          })
          .callStack([frame("f0", "hasCycle", {}, { slow, fast, round }, 8)])
          .variables({ slow, fast, round })
          .viz(capture(slow, fast))
          .explain(`Slow pointer moves 1 step forward: from Node ${oldSlow} ➔ Node ${slow}.`)
          .build()
      );

      // Move fast 2 steps
      const oldFast = fast;
      const step1 = nextMap[fast];
      fast = nextMap[step1];

      steps.push(
        step()
          .line(9)
          .fn("hasCycle")
          .event({
            type: "POINTER_MOVE",
            pointer: "fast",
            from: parseInt(oldFast, 10),
            to: parseInt(fast, 10),
            line: 9,
          })
          .callStack([frame("f0", "hasCycle", {}, { slow, fast, round }, 9)])
          .variables({ slow, fast, round })
          .viz(capture(slow, fast))
          .explain(`Fast pointer moves 2 steps forward: from Node ${oldFast} ➔ Node ${step1} ➔ Node ${fast}.`)
          .build()
      );

      // Compare slow === fast
      const isCollision = slow === fast;
      steps.push(
        step()
          .line(11)
          .fn("hasCycle")
          .event({
            type: "COMPARE",
            left: `slow(${slow})`,
            right: `fast(${fast})`,
            operator: "===",
            result: isCollision,
            line: 11,
          })
          .callStack([frame("f0", "hasCycle", {}, { slow, fast, isCollision }, 11)])
          .variables({ slow, fast, isCollision })
          .viz(capture(slow, fast))
          .explain(
            isCollision
              ? `COLLISION! Slow and Fast met at Node ${slow}. Cycle is proven!`
              : `Slow (Node ${slow}) !== Fast (Node ${fast}). Gap between pointers is closing.`
          )
          .build()
      );

      if (isCollision) {
        steps.push(
          step()
            .line(12)
            .fn("hasCycle")
            .event({
              type: "RETURN",
              functionName: "hasCycle",
              value: true,
              line: 12,
            })
            .callStack([])
            .variables({ result: true, collisionNode: slow })
            .viz(capture(slow, fast))
            .returns(true)
            .explain(`Cycle confirmed! Fast caught up to slow at Node ${slow}. Return true.`)
            .build()
        );
        break;
      }
    }

    return steps;
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription:
      "If a cycle of length C exists, the distance between fast and slow decreases by 1 in every iteration, guaranteeing collision in at most N + C steps (O(n) time).",
    spaceDescription:
      "Only two pointer variables (slow, fast) are used, requiring O(1) auxiliary memory.",
  },

  visualizationType: "linked-list",
  defaultInput: "[3, 2, 0, -4]",
  tags: ["linked-list", "two-pointer", "fast-slow", "cycle"],
};
