import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { parseTreeInput } from "@/utils/treeParser";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  TreeNodeState,
  TreeEdgeState,
  VisualizationState,
  ElementState,
} from "@/engine/executionTypes";
import type { TreeNode } from "@/utils/treeParser";

type TraversalMode = "inorder" | "preorder" | "postorder";
type TreeTraversalInput = { tree: TreeNode | null; mode: TraversalMode };

interface NodeMeta {
  [id: string]: { state: ElementState };
}

function buildState(root: TreeNode | null, nodeMeta: NodeMeta, currentNodeId: string | null): VisualizationState {
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
    nodes.push({ id: node.id, value: node.value, state: currentNodeId === node.id ? "current" : meta.state, depth, position });

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

const SOURCE_CODES: Record<TraversalMode, Record<string, string>> = {
  inorder: {
    typescript: `function inorder(node: TreeNode | null, result: number[]): void {
  if (node === null) return;
  inorder(node.left, result);
  result.push(node.value);
  inorder(node.right, result);
}`,
    python: `def inorder(node, result):
    if node is None: return
    inorder(node.left, result)
    result.append(node.val)
    inorder(node.right, result)`,
    java: `public void inorder(TreeNode node, List<Integer> result) {
    if (node == null) return;
    inorder(node.left, result);
    result.add(node.val);
    inorder(node.right, result);
}`,
    cpp: `void inorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    inorder(node->left, result);
    result.push_back(node->val);
    inorder(node->right, result);
}`
  },
  preorder: {
    typescript: `function preorder(node: TreeNode | null, result: number[]): void {
  if (node === null) return;
  result.push(node.value);
  preorder(node.left, result);
  preorder(node.right, result);
}`,
    python: `def preorder(node, result):
    if node is None: return
    result.append(node.val)
    preorder(node.left, result)
    preorder(node.right, result)`,
    java: `public void preorder(TreeNode node, List<Integer> result) {
    if (node == null) return;
    result.add(node.val);
    preorder(node.left, result);
    preorder(node.right, result);
}`,
    cpp: `void preorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    result.push_back(node->val);
    preorder(node->left, result);
    preorder(node->right, result);
}`
  },
  postorder: {
    typescript: `function postorder(node: TreeNode | null, result: number[]): void {
  if (node === null) return;
  postorder(node.left, result);
  postorder(node.right, result);
  result.push(node.value);
}`,
    python: `def postorder(node, result):
    if node is None: return
    postorder(node.left, result)
    postorder(node.right, result)
    result.append(node.val)`,
    java: `public void postorder(TreeNode node, List<Integer> result) {
    if (node == null) return;
    postorder(node.left, result);
    postorder(node.right, result);
    result.add(node.val);
}`,
    cpp: `void postorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    postorder(node->left, result);
    postorder(node->right, result);
    result.push_back(node->val);
}`
  },
};

export const treeTraversal: VisualizableAlgorithm<TreeTraversalInput> = {
  id: "tree-traversal",
  name: "Tree Traversal",
  category: "Trees",
  difficulty: "Easy",
  description: "Traverse a binary tree in Inorder, Preorder, or Postorder.",

  get sourceCode() { return SOURCE_CODES.inorder; },
  language: "typescript",
  defaultInput: JSON.stringify({ tree: "[1,2,3,4,5]", mode: "inorder" }),

  parseInput(raw: unknown): TreeTraversalInput {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return { tree: parseTreeInput(parsed.tree), mode: parsed.mode ?? "inorder" };
    }
    return raw as TreeTraversalInput;
  },

  validateInput(input: TreeTraversalInput) {
    if (!["inorder", "preorder", "postorder"].includes(input.mode))
      return { valid: false, error: "Mode must be inorder, preorder, or postorder" };
    return { valid: true };
  },

  initialVisualizationState(input: TreeTraversalInput): VisualizationState {
    return buildState(input.tree, {}, null);
  },

  complexity: { time: "O(n)", space: "O(h)" },
  visualizationType: "tree",
  tags: ["tree", "recursion", "traversal", "dfs"],

  execute(input: TreeTraversalInput): ExecutionStep[] {
    resetStepCounter();
    const { tree: root, mode } = input;
    const steps: ExecutionStep[] = [];
    const nodeMeta: NodeMeta = {};
    const result: number[] = [];
    const callStack: ReturnType<typeof frame>[] = [];
    let fid = 0;

    const fnName = mode;

    function recurse(node: TreeNode | null, depth: number, dummyId?: string) {
      const activeId = node ? node.id : (dummyId ?? "root-null");
      const fId = `trav-${fid++}`;
      const callFrame = frame(fId, fnName, { node: node?.value ?? null }, { node: node?.value ?? null, result: [...result] }, 1);
      callStack.push(callFrame);

      nodeMeta[activeId] = { state: "current" };

      steps.push(
        step().line(1).fn(fnName)
          .event({ type: "CALL", functionName: fnName, args: { node: node?.value ?? null }, line: 1 })
          .callStack([...callStack]).variables({ node: node?.value ?? null, result: [...result] })
          .viz(buildState(root, { ...nodeMeta }, activeId))
          .explain(`Call ${fnName}(${node ? node.value : "null"}).${node ? ` Depth ${depth}.` : " Base case — return (∅)."}`)
          .depth(depth).build()
      );

      if (!node) { 
        nodeMeta[activeId] = { state: "visited" };
        callStack.pop(); 
        return; 
      }

      const val = node.value as number;
      const leftDummyId = `${node.id}-left-null`;
      const rightDummyId = `${node.id}-right-null`;

      if (mode === "preorder") {
        result.push(val);
        nodeMeta[node.id] = { state: "visited" };
        steps.push(step().line(4).fn(fnName).event({ type: "VISIT", target: val, line: 4 }).callStack([...callStack]).variables({ node: val, result: [...result] }).viz(buildState(root, { ...nodeMeta }, node.id)).explain(`Preorder: Visit root first.\nAdd ${val} to result.\nResult: [${result.join(", ")}]`).depth(depth).build());
        recurse(node.left, depth + 1, leftDummyId);
        nodeMeta[node.id] = { state: "visited" };
        recurse(node.right, depth + 1, rightDummyId);
        nodeMeta[node.id] = { state: "visited" };
      } else if (mode === "inorder") {
        recurse(node.left, depth + 1, leftDummyId);
        nodeMeta[node.id] = { state: "current" };
        result.push(val);
        nodeMeta[node.id] = { state: "visited" };
        steps.push(step().line(5).fn(fnName).event({ type: "VISIT", target: val, line: 5 }).callStack([...callStack]).variables({ node: val, result: [...result] }).viz(buildState(root, { ...nodeMeta }, node.id)).explain(`Inorder: Left done. Visit ${val}.\nResult: [${result.join(", ")}]`).depth(depth).build());
        recurse(node.right, depth + 1, rightDummyId);
        nodeMeta[node.id] = { state: "visited" };
      } else {
        recurse(node.left, depth + 1, leftDummyId);
        nodeMeta[node.id] = { state: "current" };
        recurse(node.right, depth + 1, rightDummyId);
        nodeMeta[node.id] = { state: "current" };
        result.push(val);
        nodeMeta[node.id] = { state: "visited" };
        steps.push(step().line(6).fn(fnName).event({ type: "VISIT", target: val, line: 6 }).callStack([...callStack]).variables({ node: val, result: [...result] }).viz(buildState(root, { ...nodeMeta }, node.id)).explain(`Postorder: Both children done. Visit ${val}.\nResult: [${result.join(", ")}]`).depth(depth).build());
      }

      callStack.pop();
    }

    recurse(root, 0);

    steps.push(
      step().line(7).fn(fnName)
        .event({ type: "RETURN", functionName: fnName, value: result, line: 7 })
        .callStack([]).variables({ result: JSON.stringify(result) })
        .viz(buildState(root, { ...nodeMeta }, null))
        .explain(`${mode.charAt(0).toUpperCase() + mode.slice(1)} traversal complete!\n\nResult: [${result.join(", ")}]`)
        .returns(result).build()
    );

    return steps;
  },
};
