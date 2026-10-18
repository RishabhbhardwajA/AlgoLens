import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { parseTreeInput, type TreeNode } from "@/utils/treeParser";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  TreeNodeState,
  TreeEdgeState,
  VisualizationState,
  CallFrame,
  ElementState,
} from "@/engine/executionTypes";

type InvertTreeInput = TreeNode | null;

interface NodeMetaMap {
  [id: string]: { state: ElementState };
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

export const invertTree: VisualizableAlgorithm<InvertTreeInput> = {
  id: "invert-tree",
  name: "Invert Binary Tree",
  category: "Trees",
  difficulty: "Easy",
  description: "Recursively invert a binary tree, swapping left and right children at each node.",
  
  sourceCode: {
    typescript: `function invertTree(node: TreeNode | null): TreeNode | null {
  // Base case
  if (node === null) {
    return null;
  }

  // Recurse left
  const left = invertTree(node.left);
  // Recurse right
  const right = invertTree(node.right);

  // Swap children
  node.left = right;
  node.right = left;

  return node;
}`,
    python: `def invertTree(node):
    if node is None:
        return None
        
    left = invertTree(node.left)
    right = invertTree(node.right)
    
    node.left = right
    node.right = left
    
    return node`,
    java: `class Solution {
    public TreeNode invertTree(TreeNode node) {
        if (node == null) {
            return null;
        }
        
        TreeNode left = invertTree(node.left);
        TreeNode right = invertTree(node.right);
        
        node.left = right;
        node.right = left;
        
        return node;
    }
}`,
    cpp: `class Solution {
public:
    TreeNode* invertTree(TreeNode* node) {
        if (node == nullptr) {
            return nullptr;
        }
        
        TreeNode* left = invertTree(node->left);
        TreeNode* right = invertTree(node->right);
        
        node->left = right;
        node->right = left;
        
        return node;
    }
};`
  },
  
  language: "typescript",
  defaultInput: "[4,2,7,1,3,6,9]",

  parseInput(raw: unknown): InvertTreeInput {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    return parseTreeInput(str);
  },

  validateInput() {
    return { valid: true };
  },

  initialVisualizationState(input: InvertTreeInput): VisualizationState {
    return buildTreeState(input, {}, null);
  },

  complexity: {
    time: "O(n)",
    space: "O(h)",
    timeDescription: "Each node is visited once.",
    spaceDescription: "Call stack goes as deep as the tree height.",
  },
  visualizationType: "tree",
  tags: ["tree", "recursion", "dfs"],

  execute(input: InvertTreeInput): ExecutionStep[] {
    resetStepCounter();
    // Deep clone the input tree so we don't mutate the original input ref
    const root = parseTreeInput(JSON.stringify(input));
    const steps: ExecutionStep[] = [];
    const nodeMeta: NodeMetaMap = {};
    let frameIdCounter = 0;
    const callStack: CallFrame[] = [];

    function recurse(node: TreeNode | null, depth: number, dummyId?: string): TreeNode | null {
      const frameId = `invert-${frameIdCounter++}`;
      const activeId = node ? node.id : (dummyId ?? "root-null");

      const callFrame: CallFrame = frame(
        frameId,
        "invertTree",
        { node: node ? node.value : null },
        { node: node ? node.value : null, left: "?", right: "?" },
        1
      );
      callStack.push(callFrame);

      nodeMeta[activeId] = { state: "current" };

      steps.push(
        step()
          .line(1)
          .fn("invertTree")
          .event({ type: "CALL", functionName: "invertTree", args: { node: node?.value ?? null }, line: 1 })
          .callStack([...callStack])
          .variables({ node: node?.value ?? null })
          .viz(buildTreeState(root, { ...nodeMeta }, activeId))
          .explain(
            node
              ? `Call invertTree(node=${node.value}).\n\nEntering node ${node.value} at depth ${depth}.`
              : `Call invertTree(null).\n\nBase case: reached an empty node (∅).`
          )
          .depth(depth)
          .recursive(depth > 0)
          .build()
      );

      if (!node) {
        nodeMeta[activeId] = { state: "visited" };
        steps.push(
          step()
            .line(4)
            .fn("invertTree")
            .event({ type: "RETURN", functionName: "invertTree", value: null, line: 4 })
            .callStack([...callStack])
            .variables({ node: null, returns: null })
            .viz(buildTreeState(root, { ...nodeMeta }, activeId))
            .explain("Base case: node is null.\nReturn null.")
            .depth(depth)
            .returns(null)
            .build()
        );
        callStack.pop();
        return null;
      }

      const leftDummyId = `${node.id}-left-null`;
      steps.push(
        step()
          .line(8)
          .fn("invertTree")
          .event({ type: "CALL", functionName: "invertTree", args: { node: node.left?.value ?? null }, line: 8 })
          .callStack([...callStack])
          .variables({ node: node.value, left: "computing..." })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`Invert Left Subtree of ${node.value}.`)
          .depth(depth)
          .build()
      );

      nodeMeta[node.id] = { state: "comparing" };
      const left = recurse(node.left, depth + 1, leftDummyId);
      nodeMeta[node.id] = { state: "current" };

      const rightDummyId = `${node.id}-right-null`;
      steps.push(
        step()
          .line(10)
          .fn("invertTree")
          .event({ type: "CALL", functionName: "invertTree", args: { node: node.right?.value ?? null }, line: 10 })
          .callStack([...callStack])
          .variables({ node: node.value, left: left?.value ?? null, right: "computing..." })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`Invert Right Subtree of ${node.value}.`)
          .depth(depth)
          .build()
      );

      nodeMeta[node.id] = { state: "comparing" };
      const right = recurse(node.right, depth + 1, rightDummyId);
      nodeMeta[node.id] = { state: "current" };

      steps.push(
        step()
          .line(13)
          .fn("invertTree")
          .event({ type: "STEP", description: "Swapping children", line: 13 })
          .callStack([...callStack])
          .variables({ node: node.value, left: left?.value ?? null, right: right?.value ?? null })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`Both subtrees of ${node.value} are inverted.\n\nNow swapping the left and right children.`)
          .depth(depth)
          .build()
      );

      // Mutate
      node.left = right;
      node.right = left;

      steps.push(
        step()
          .line(14)
          .fn("invertTree")
          .event({ type: "SWAP", indices: [0, 1], array: [], line: 14 })
          .callStack([...callStack])
          .variables({ node: node.value, left: right?.value ?? null, right: left?.value ?? null })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`Children swapped successfully.`)
          .depth(depth)
          .build()
      );

      steps.push(
        step()
          .line(16)
          .fn("invertTree")
          .event({ type: "RETURN", functionName: "invertTree", value: node.value, line: 16 })
          .callStack([...callStack])
          .variables({ node: node.value })
          .viz(buildTreeState(root, { ...nodeMeta }, node.id))
          .explain(`Return node ${node.value}.`)
          .depth(depth)
          .returns(node.value)
          .build()
      );

      nodeMeta[node.id] = { state: "visited" };
      callStack.pop();

      return node;
    }

    recurse(root, 0);

    steps.push(
      step()
        .line(16)
        .fn("invertTree")
        .event({ type: "RETURN", functionName: "invertTree", value: root?.value ?? null, line: 16 })
        .callStack([])
        .variables({})
        .viz(buildTreeState(root, { ...nodeMeta }, null))
        .explain(`Algorithm complete!\n\nThe binary tree is now inverted.`)
        .build()
    );

    return steps;
  },
};
