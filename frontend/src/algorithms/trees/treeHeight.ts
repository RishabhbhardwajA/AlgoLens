import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { parseTreeInput } from "@/utils/treeParser";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  TreeNodeState,
  TreeEdgeState,
  VisualizationState,
  CallFrame,
  ElementState,
} from "@/engine/executionTypes";
import type { TreeNode } from "@/utils/treeParser";

// ============================================================
// HEIGHT OF BINARY TREE
// The flagship recursive algorithm — full call trace
// ============================================================

type TreeHeightInput = TreeNode | null;

interface NodeMetaMap {
  [id: string]: { state: ElementState; returnValue?: number };
}

function buildTreeState(
  root: TreeNode | null,
  nodeMeta: NodeMetaMap,
  currentNodeId: string | null
): VisualizationState {
  const nodes: TreeNodeState[] = [];
  const edges: TreeEdgeState[] = [];

  function traverse(node: TreeNode | null, depth: number, position: number, parentId: string | null, side: "left"|"right"|null) {
    if (!node) {
      // Dummy null node
      const id = parentId ? `${parentId}-${side}-null` : "root-null";
      const meta = nodeMeta[id] ?? { state: "default" };
      nodes.push({ id, value: null, state: currentNodeId === id ? "current" : meta.state, depth, position });
      if (parentId) {
        edges.push({
          id: `${parentId}-${id}`,
          source: parentId,
          target: id,
          state: meta.state === "visited" || meta.state === "returning" ? "traversed" : "default",
          label: side === "left" ? "L" : "R",
        });
      }
      return;
    }

    const meta = nodeMeta[node.id] ?? { state: "default" as ElementState };
    nodes.push({
      id: node.id,
      value: node.value,
      state: currentNodeId === node.id ? "current" : meta.state,
      returnValue: meta.returnValue,
      depth,
      position,
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        state: meta.state === "visited" || meta.state === "returning" ? "traversed" : "default",
        label: side === "left" ? "L" : "R",
      });
    }

    traverse(node.left, depth + 1, position * 2, node.id, "left");
    traverse(node.right, depth + 1, position * 2 + 1, node.id, "right");
  }

  traverse(root, 0, 0, null, null);
  return { type: "tree", nodes, edges, currentNodeId: currentNodeId ?? undefined };
}

export const treeHeight: VisualizableAlgorithm<TreeHeightInput> = {
  id: "tree-height",
  name: "Height of Binary Tree",
  category: "Trees",
  difficulty: "Easy",
  description: "Find the maximum depth of a binary tree using post-order recursion.",

  sourceCode: {
    typescript: `function height(node: TreeNode | null): number {
  // Base case: empty node has height 0
  if (node === null) {
    return 0;
  }

  // Recurse on left subtree
  const left = height(node.left);

  // Recurse on right subtree
  const right = height(node.right);

  // Height is max of children + 1 (this node)
  return Math.max(left, right) + 1;
}`,
    python: `def height(node):
    # Base case: empty node has height 0
    if node is None:
        return 0
        
    # Recurse on left subtree
    left = height(node.left)
    
    # Recurse on right subtree
    right = height(node.right)
    
    # Height is max of children + 1 (this node)
    return max(left, right) + 1`,
    java: `class Solution {
    public int height(TreeNode node) {
        // Base case: empty node has height 0
        if (node == null) {
            return 0;
        }
        
        // Recurse on left subtree
        int left = height(node.left);
        
        // Recurse on right subtree
        int right = height(node.right);
        
        // Height is max of children + 1 (this node)
        return Math.max(left, right) + 1;
    }
}`,
    cpp: `class Solution {
public:
    int height(TreeNode* node) {
        // Base case: empty node has height 0
        if (node == nullptr) {
            return 0;
        }
        
        // Recurse on left subtree
        int left = height(node->left);
        
        // Recurse on right subtree
        int right = height(node->right);
        
        // Height is max of children + 1 (this node)
        return std::max(left, right) + 1;
    }
};`
  },

  language: "typescript",
  defaultInput: "[1,2,3,4,5,null,6]",

  parseInput(raw: unknown): TreeHeightInput {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    return parseTreeInput(str);
  },

  validateInput(input: TreeHeightInput) {
    // null is valid (empty tree)
    return { valid: true };
  },

  initialVisualizationState(input: TreeHeightInput): VisualizationState {
    return buildTreeState(input, {}, null);
  },

  complexity: {
    time: "O(n)",
    space: "O(h)",
    timeDescription: "Every node is visited exactly once",
    spaceDescription: "Call stack depth equals tree height h",
  },
  visualizationType: "tree",
  tags: ["tree", "recursion", "dfs", "depth"],

  execute(input: TreeHeightInput): ExecutionStep[] {
    resetStepCounter();
    const root = input;
    const steps: ExecutionStep[] = [];
    const nodeMeta: NodeMetaMap = {};
    let frameIdCounter = 0;

    // We'll maintain a mutable call stack for the Zustand display
    const callStack: CallFrame[] = [];

    function recurse(node: TreeNode | null, depth: number, dummyId?: string): number {
      const frameId = `height-${frameIdCounter++}`;
      const activeId = node ? node.id : (dummyId ?? "root-null");

      // ---- CALL step ----
      const callFrame: CallFrame = frame(
        frameId,
        "height",
        { node: node ? node.value : null },
        { node: node ? node.value : null, left: "?", right: "?" },
        3
      );
      callStack.push(callFrame);

      // Mark current node as active
      nodeMeta[activeId] = { state: "current" };

      steps.push(
        step()
          .line(3)
          .fn("height")
          .event({
            type: "CALL",
            functionName: "height",
            args: { node: node ? node.value : null },
            line: 3,
          })
          .callStack([...callStack])
          .variables({ node: node ? node.value : null })
          .viz(buildTreeState(root, { ...nodeMeta }, activeId))
          .explain(
            node
              ? `Call height(node=${node.value}).\n\nEntering node ${node.value} at depth ${depth}.\n\nWill first recurse into left subtree, then right subtree.`
              : `Call height(null).\n\nBase case: reached an empty node (∅).\nReturn 0 immediately.`
          )
          .depth(depth)
          .recursive(depth > 0)
          .build()
      );

      // ---- Base case ----
      if (!node) {
        nodeMeta[activeId] = { state: "visited", returnValue: 0 };
        steps.push(
          step()
            .line(4)
            .fn("height")
            .event({ type: "RETURN", functionName: "height", value: 0, line: 4 })
            .callStack([...callStack])
            .variables({ node: null, returns: 0 })
            .viz(buildTreeState(root, { ...nodeMeta }, activeId))
            .explain("Base case: node is null.\nReturn 0.")
            .depth(depth)
            .returns(0)
            .build()
        );
        callStack.pop();
        return 0;
      }

      // ---- Recurse left ----
      const leftDummyId = `${node.id}-left-null`;
      steps.push(
        step()
          .line(8)
          .fn("height")
          .event({ type: "CALL", functionName: "height", args: { node: node.left?.value ?? null }, line: 8 })
          .callStack([...callStack])
          .variables({ node: node.value, left: "computing..." })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`height(${node.value}): Recursing into LEFT subtree.\n\nCalling height(${node.left ? node.left.value : "null"}).`)
          .depth(depth)
          .build()
      );

      nodeMeta[node.id] = { state: "comparing" };
      const left = recurse(node.left, depth + 1, leftDummyId);
      nodeMeta[node.id] = { state: "current" };

      // ---- Recurse right ----
      const rightDummyId = `${node.id}-right-null`;
      steps.push(
        step()
          .line(11)
          .fn("height")
          .event({ type: "CALL", functionName: "height", args: { node: node.right?.value ?? null }, line: 11 })
          .callStack([...callStack])
          .variables({ node: node.value, left, right: "computing..." })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`height(${node.value}): Left returned ${left}.\nNow recursing into RIGHT subtree.\n\nCalling height(${node.right ? node.right.value : "null"}).`)
          .depth(depth)
          .build()
      );

      nodeMeta[node.id] = { state: "comparing" };
      const right = recurse(node.right, depth + 1, rightDummyId);
      nodeMeta[node.id] = { state: "current" };

      // ---- Compute result ----
      const result = Math.max(left, right) + 1;

      steps.push(
        step()
          .line(14)
          .fn("height")
          .event({ type: "RETURN", functionName: "height", value: result, line: 14 })
          .callStack([...callStack])
          .variables({ node: node.value, left, right, result })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(
            `height(${node.value}): Both children computed.\n\nleft = ${left}, right = ${right}\n\nmax(${left}, ${right}) + 1 = ${result}\n\nReturn ${result}.`
          )
          .depth(depth)
          .returns(result)
          .build()
      );

      // Mark node as fully resolved
      nodeMeta[node.id] = { state: "visited", returnValue: result };
      callStack.pop();

      return result;
    }

    const finalHeight = recurse(root, 0);

    // Final summary step
    steps.push(
      step()
        .line(14)
        .fn("height")
        .event({ type: "RETURN", functionName: "height", value: finalHeight, line: 14 })
        .callStack([])
        .variables({ result: finalHeight })
        .viz(buildTreeState(root, { ...nodeMeta }, null))
        .explain(`Algorithm complete!\n\nThe height of the binary tree is ${finalHeight}.\n\nThis means the longest path from root to any leaf has ${finalHeight} node(s).`)
        .returns(finalHeight)
        .build()
    );

    return steps;
  },
};
