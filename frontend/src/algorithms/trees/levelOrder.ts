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

type LevelOrderInput = TreeNode | null;

interface NodeMeta { [id: string]: { state: ElementState } }

function buildState(root: TreeNode | null, nodeMeta: NodeMeta, currentId: string | null): VisualizationState {
  const nodes: TreeNodeState[] = [];
  const edges: TreeEdgeState[] = [];
  function traverse(n: TreeNode | null, d: number, p: number) {
    if (!n) return;
    const m = nodeMeta[n.id] ?? { state: "default" as ElementState };
    nodes.push({ id: n.id, value: n.value, state: currentId === n.id ? "current" : m.state, depth: d, position: p });
    if (n.left) { edges.push({ id: `${n.id}-${n.left.id}`, source: n.id, target: n.left.id, state: "default" }); traverse(n.left, d + 1, p * 2); }
    if (n.right) { edges.push({ id: `${n.id}-${n.right.id}`, source: n.id, target: n.right.id, state: "default" }); traverse(n.right, d + 1, p * 2 + 1); }
  }
  traverse(root, 0, 0);
  return { type: "tree", nodes, edges, currentNodeId: currentId ?? undefined };
}

export const levelOrder: VisualizableAlgorithm<LevelOrderInput> = {
  id: "level-order",
  name: "Level Order Traversal",
  category: "Trees",
  difficulty: "Medium",
  description: "Traverse a binary tree level by level using BFS (a queue).",

  sourceCode: {
    typescript: `function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    const level: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      level.push(node.value);

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }

  return result;
}`,
    python: `def levelOrder(root):
    if not root: return []
    result = []
    queue = collections.deque([root])
    
    while queue:
        levelSize = len(queue)
        level = []
        
        for _ in range(levelSize):
            node = queue.popleft()
            level.append(node.val)
            
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
            
        result.append(level)
        
    return result`,
    java: `class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        
        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            List<Integer> level = new ArrayList<>();
            
            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            result.add(level);
        }
        
        return result;
    }
}`,
    cpp: `class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> result;
        if (!root) return result;
        
        queue<TreeNode*> q;
        q.push(root);
        
        while (!q.empty()) {
            int levelSize = q.size();
            vector<int> level;
            
            for (int i = 0; i < levelSize; i++) {
                TreeNode* node = q.front();
                q.pop();
                level.push_back(node->val);
                
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            result.push_back(level);
        }
        
        return result;
    }
};`
  },

  language: "typescript",
  defaultInput: "[1,2,3,4,5,null,6]",

  parseInput(raw: unknown): LevelOrderInput {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    return parseTreeInput(str);
  },
  validateInput() { return { valid: true }; },
  initialVisualizationState(input: LevelOrderInput): VisualizationState {
    return buildState(input, {}, null);
  },
  complexity: { time: "O(n)", space: "O(n)" },
  visualizationType: "tree",
  tags: ["tree", "bfs", "queue", "traversal"],

  execute(input: LevelOrderInput): ExecutionStep[] {
    resetStepCounter();
    const root = input;
    const steps: ExecutionStep[] = [];
    if (!root) {
      steps.push(step().line(2).fn("levelOrder").event({ type: "RETURN", functionName: "levelOrder", value: [], line: 2 }).callStack([]).variables({}).viz({ type: "none" }).explain("Empty tree. Return [].").returns([]).build());
      return steps;
    }

    const nodeMeta: NodeMeta = {};
    const result: number[][] = [];
    const queue: TreeNode[] = [root];
    const cf = () => frame("lo-0", "levelOrder", { root: root.value }, { queue: queue.map(n => n.value), result: JSON.stringify(result) }, 1);

    while (queue.length > 0) {
      const levelSize = queue.length;
      const level: number[] = [];
      const levelNum = result.length + 1;

      steps.push(
        step().line(7).fn("levelOrder")
          .event({ type: "STEP", description: `Start level ${levelNum}`, line: 7 })
          .callStack([cf()])
          .variables({ levelSize, "queue": queue.map(n => n.value), result: JSON.stringify(result) })
          .viz(buildState(root, { ...nodeMeta }, null))
          .explain(`Level ${levelNum}: Queue has ${levelSize} node(s) to process.\nQueue: [${queue.map(n => n.value).join(", ")}]`)
          .build()
      );

      for (let i = 0; i < levelSize; i++) {
        const node = queue.shift()!;
        const nodeVal = node.value as number;
        nodeMeta[node.id] = { state: "current" };
        level.push(nodeVal);

        steps.push(
          step().line(11).fn("levelOrder")
            .event({ type: "VISIT", target: nodeVal, line: 11 })
            .callStack([cf()])
            .variables({ node: nodeVal, level: JSON.stringify(level), remaining: queue.map(n => n.value) })
            .viz(buildState(root, { ...nodeMeta }, node.id))
            .explain(`Dequeue node ${nodeVal}.\nAdd to current level: [${level.join(", ")}]\n${node.left || node.right ? `Will enqueue children: ${[node.left?.value, node.right?.value].filter(Boolean).join(", ")}` : "No children to enqueue."}`)
            .build()
        );

        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);

        nodeMeta[node.id] = { state: "visited" };
      }

      result.push(level);

      steps.push(
        step().line(18).fn("levelOrder")
          .event({ type: "UPDATE", variable: "result", oldValue: undefined, newValue: result, line: 18 })
          .callStack([cf()])
          .variables({ level: JSON.stringify(level), result: JSON.stringify(result) })
          .viz(buildState(root, { ...nodeMeta }, null))
          .explain(`Level ${levelNum} complete: [${level.join(", ")}]\nResult so far: ${JSON.stringify(result)}`)
          .build()
      );
    }

    steps.push(
      step().line(21).fn("levelOrder")
        .event({ type: "RETURN", functionName: "levelOrder", value: result, line: 21 })
        .callStack([]).variables({ result: JSON.stringify(result) })
        .viz(buildState(root, { ...nodeMeta }, null))
        .explain(`Level order traversal complete!\n\nResult: ${JSON.stringify(result)}`)
        .returns(result).build()
    );

    return steps;
  },
};
