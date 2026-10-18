import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  CallFrame,
  VisualizationState,
  TreeNodeState,
  TreeEdgeState,
  ElementState,
} from "@/engine/executionTypes";
import { parseTreeInput, type TreeNode } from "@/utils/treeParser";

type BSTSearchInput = { tree: TreeNode | null; target: number; rawTree: string };

interface NodeMeta {
  [id: string]: { state: ElementState };
}

function buildState(root: TreeNode | null, nodeMeta: NodeMeta, currentId: string | null): VisualizationState {
  const nodes: TreeNodeState[] = [];
  const edges: TreeEdgeState[] = [];

  function traverse(node: TreeNode | null, depth: number, position: number, parentId: string | null, side: "left" | "right" | null) {
    if (!node) {
      const id = parentId ? `${parentId}-${side}-null` : "root-null";
      const meta = nodeMeta[id] ?? { state: "default" };
      nodes.push({ id, value: null, state: currentId === id ? "current" : meta.state, depth, position });
      if (parentId) {
        edges.push({
          id: `${parentId}-${id}`, source: parentId, target: id,
          state: "default", label: side === "left" ? "L" : "R",
        });
      }
      return;
    }

    const meta = nodeMeta[node.id] ?? { state: "default" as ElementState };
    nodes.push({ id: node.id, value: node.value, state: currentId === node.id ? "current" : meta.state, depth, position });
    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`, source: parentId, target: node.id,
        state: meta.state === "visited" || meta.state === "found" ? "traversed" : "default",
        label: side === "left" ? "L" : "R",
      });
    }
    traverse(node.left, depth + 1, position * 2, node.id, "left");
    traverse(node.right, depth + 1, position * 2 + 1, node.id, "right");
  }

  traverse(root, 0, 0, null, null);
  return { type: "tree", nodes, edges, currentNodeId: currentId ?? undefined };
}

export const bstSearch: VisualizableAlgorithm<BSTSearchInput> = {
  id: "bst-search",
  name: "BST Search",
  category: "Trees",
  difficulty: "Easy",
  description: "Search for a value in a Binary Search Tree. At each node, decide to go left or right based on comparison with target.",

  sourceCode: {
    typescript: `function searchBST(root: TreeNode | null, target: number): TreeNode | null {
  // Base case: not found or matched
  if (root === null) return null;
  if (root.val === target) return root;

  // Go left if target is smaller, right if larger
  if (target < root.val) {
    return searchBST(root.left, target);
  } else {
    return searchBST(root.right, target);
  }
}`,
    python: `def searchBST(root, target):
    # Base case
    if root is None: return None
    if root.val == target: return root
    
    # BST property: go left or right
    if target < root.val:
        return searchBST(root.left, target)
    else:
        return searchBST(root.right, target)`,
    java: `class Solution {
    public TreeNode searchBST(TreeNode root, int target) {
        if (root == null) return null;
        if (root.val == target) return root;
        
        if (target < root.val)
            return searchBST(root.left, target);
        else
            return searchBST(root.right, target);
    }
}`,
    cpp: `class Solution {
public:
    TreeNode* searchBST(TreeNode* root, int target) {
        if (!root) return nullptr;
        if (root->val == target) return root;
        
        if (target < root->val)
            return searchBST(root->left, target);
        else
            return searchBST(root->right, target);
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify({ tree: "[4,2,7,1,3]", target: 3 }),

  parseInput(raw: unknown): BSTSearchInput {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw as { tree: string; target: number };
    const root = parseTreeInput(parsed.tree);
    return { tree: root, target: parsed.target, rawTree: parsed.tree };
  },

  validateInput(input: BSTSearchInput) {
    if (input.target === undefined || input.target === null) return { valid: false, error: "Target value is required" };
    return { valid: true };
  },

  initialVisualizationState(input: BSTSearchInput): VisualizationState {
    return buildState(input.tree, {}, null);
  },

  complexity: {
    time: "O(h)",
    space: "O(h)",
    timeDescription: "O(h) where h is tree height. O(log n) for balanced BST",
    spaceDescription: "O(h) call stack depth",
  },
  visualizationType: "tree",
  tags: ["tree", "bst", "recursion", "search", "binary-search-tree"],

  execute(input: BSTSearchInput): ExecutionStep[] {
    resetStepCounter();
    const root = input.tree;
    const target = input.target;
    const steps: ExecutionStep[] = [];
    const callStack: CallFrame[] = [];
    const nodeMeta: NodeMeta = {};
    let frameId = 0;

    function recurse(node: TreeNode | null, depth: number, dummyId?: string): TreeNode | null {
      const fId = `bst-${frameId++}`;
      const activeId = node ? node.id : (dummyId ?? "root-null");
      const cf = frame(fId, "searchBST", { root: node?.value ?? null, target }, { node: node?.value ?? null, target }, 1);
      callStack.push(cf);

      nodeMeta[activeId] = { state: "current" };

      steps.push(
        step()
          .line(node === null ? 2 : node.value === target ? 3 : target < (node.value ?? 0) ? 6 : 8)
          .fn("searchBST")
          .event({ type: "CALL", functionName: "searchBST", args: { node: node?.value ?? null, target }, line: 1 })
          .callStack([...callStack])
          .variables({ node: node?.value ?? null, target })
          .viz(buildState(root, { ...nodeMeta }, activeId))
          .explain(node === null
            ? `Reached null node.\n\nTarget ${target} not found in BST.\nReturn null.`
            : node.value === target
            ? `Found! node.val = ${node.value} === target ${target}.\n\nReturn this node.`
            : target < (node.value ?? 0)
            ? `At node ${node.value}.\n\nTarget ${target} < ${node.value}.\nGo LEFT — smaller values are in the left subtree.`
            : `At node ${node.value}.\n\nTarget ${target} > ${node.value}.\nGo RIGHT — larger values are in the right subtree.`)
          .depth(depth)
          .recursive(depth > 0)
          .build()
      );

      if (!node) {
        nodeMeta[activeId] = { state: "eliminated" };
        steps.push(
          step()
            .line(2)
            .fn("searchBST")
            .event({ type: "RETURN", functionName: "searchBST", value: null, line: 2 })
            .callStack([...callStack])
            .variables({ node: null, returns: null })
            .viz(buildState(root, { ...nodeMeta }, activeId))
            .explain(`Not found. Return null.`)
            .depth(depth)
            .returns(null)
            .build()
        );
        callStack.pop();
        return null;
      }

      if (node.value === target) {
        nodeMeta[node.id] = { state: "found" };
        steps.push(
          step()
            .line(3)
            .fn("searchBST")
            .event({ type: "RETURN", functionName: "searchBST", value: node.value, line: 3 })
            .callStack([...callStack])
            .variables({ node: node.value, returns: node.value })
            .viz(buildState(root, { ...nodeMeta }, node.id))
            .explain(`Found target ${target}!\nReturn this node.`)
            .depth(depth)
            .returns(node.value)
            .build()
        );
        callStack.pop();
        return node;
      }

      nodeMeta[node.id] = { state: "visited" };

      if (target < (node.value ?? 0)) {
        const leftDummy = `${node.id}-left-null`;
        const result = recurse(node.left, depth + 1, leftDummy);
        callStack.pop();
        return result;
      } else {
        const rightDummy = `${node.id}-right-null`;
        const result = recurse(node.right, depth + 1, rightDummy);
        callStack.pop();
        return result;
      }
    }

    const found = recurse(root, 0);

    if (!found) {
      steps.push(
        step()
          .line(11)
          .fn("searchBST")
          .event({ type: "RETURN", functionName: "searchBST", value: null, line: 11 })
          .callStack([])
          .variables({ result: null })
          .viz(buildState(root, { ...nodeMeta }, null))
          .explain(`Search complete.\n\nTarget ${target} was NOT found in the BST.`)
          .build()
      );
    }

    return steps;
  },
};
