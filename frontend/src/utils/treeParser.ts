/**
 * Parse a LeetCode-style array string like "[1,2,null,3,4]" into a tree.
 */

export interface TreeNode {
  id: string;
  value: number | null;
  left: TreeNode | null;
  right: TreeNode | null;
}

/** Parse "[1,2,3,null,5]" → TreeNode */
export function parseTreeInput(input: string): TreeNode | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "[]" || trimmed === "null") return null;

  // Remove surrounding brackets
  const inner = trimmed.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return null;

  const parts = inner.split(",").map((s) => s.trim());
  if (parts.length === 0 || parts[0] === "null") return null;

  const nodes: (TreeNode | null)[] = [];
  let idCounter = 0;

  for (const part of parts) {
    if (part === "null" || part === "") {
      nodes.push(null);
    } else {
      const val = parseInt(part, 10);
      if (isNaN(val)) throw new Error(`Invalid tree value: "${part}"`);
      nodes.push({ id: `node-${idCounter++}`, value: val, left: null, right: null });
    }
  }

  // Level-order assignment of children
  const root = nodes[0];
  if (!root) return null;

  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < nodes.length) {
    const current = queue.shift()!;

    if (i < nodes.length) {
      current.left = nodes[i++];
      if (current.left) queue.push(current.left);
    }
    if (i < nodes.length) {
      current.right = nodes[i++];
      if (current.right) queue.push(current.right);
    }
  }

  return root;
}

/** Convert TreeNode to a flat list of nodes with depth/position for layout */
export interface FlatTreeNode {
  id: string;
  value: number | null;
  depth: number;
  position: number; // 0-indexed within its depth level
  parentId: string | null;
  side: "left" | "right" | null;
}

export function flattenTree(root: TreeNode | null): FlatTreeNode[] {
  if (!root) return [];

  const result: FlatTreeNode[] = [];
  const queue: Array<{ node: TreeNode; depth: number; position: number; parentId: string | null; side: "left" | "right" | null }> = [
    { node: root, depth: 0, position: 0, parentId: null, side: null },
  ];

  const positionCounters: Record<number, number> = {};

  while (queue.length > 0) {
    const { node, depth, parentId, side } = queue.shift()!;

    if (!(depth in positionCounters)) positionCounters[depth] = 0;
    const position = positionCounters[depth]++;

    result.push({ id: node.id, value: node.value, depth, position, parentId, side });

    if (node.left) queue.push({ node: node.left, depth: depth + 1, position: 0, parentId: node.id, side: "left" });
    if (node.right) queue.push({ node: node.right, depth: depth + 1, position: 0, parentId: node.id, side: "right" });
  }

  return result;
}

/** Get a node by ID from a tree */
export function findNodeById(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  return findNodeById(root.left, id) || findNodeById(root.right, id);
}

/** Count nodes */
export function countNodes(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
}
