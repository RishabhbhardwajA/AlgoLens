import {
  type VisualizableAlgorithm,
  type VisualizationState,
  type GridCell,
  type ExecutionStep,
} from "@/engine/executionTypes";
import { resetStepCounter, step } from "@/engine/stepBuilder";

export interface GridInput {
  rows: number;
  cols: number;
  walls: [number, number][];
  start: [number, number];
  end: [number, number];
}

const BFS_SOURCE = {
  typescript: [
    "function bfs(grid: number[][], start: [r, c], end: [r, c]) {",
    "  const rows = grid.length, cols = grid[0].length;",
    "  const queue = [start];",
    "  const visited = new Set(['r0,c0']);",
    "",
    "  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];",
    "",
    "  while (queue.length > 0) {",
    "    const [r, c] = queue.shift();",
    "    if (r === end[0] && c === end[1]) return true;",
    "",
    "    for (const [dr, dc] of dirs) {",
    "      const nr = r+dr, nc = c+dc;",
    "      const key = nr+','+nc;",
    "      if (nr>=0 && nr<rows && nc>=0 && nc<cols)",
    "        if (grid[nr][nc]!==1 && !visited.has(key)) {",
    "          visited.add(key);",
    "          queue.push([nr, nc]);",
    "        }",
    "    }",
    "  }",
    "  return false;",
    "}",
  ].join("\n"),

  python: [
    "def bfs(grid, start, end):",
    "    rows, cols = len(grid), len(grid[0])",
    "    queue = collections.deque([start])",
    "    visited = set([start])",
    "    dirs = [(-1,0),(1,0),(0,-1),(0,1)]",
    "",
    "    while queue:",
    "        r, c = queue.popleft()",
    "        if r == end[0] and c == end[1]:",
    "            return True",
    "        for dr, dc in dirs:",
    "            nr, nc = r+dr, c+dc",
    "            if 0<=nr<rows and 0<=nc<cols:",
    "                if grid[nr][nc]!=1 and (nr,nc) not in visited:",
    "                    visited.add((nr,nc))",
    "                    queue.append((nr,nc))",
    "    return False",
  ].join("\n"),

  java: [
    "class Solution {",
    "    public boolean bfs(int[][] grid, int[] start, int[] end) {",
    "        int rows = grid.length, cols = grid[0].length;",
    "        Queue<int[]> q = new LinkedList<>();",
    "        boolean[][] vis = new boolean[rows][cols];",
    "        q.add(start); vis[start[0]][start[1]] = true;",
    "        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};",
    "        while (!q.isEmpty()) {",
    "            int[] c = q.poll();",
    "            if (c[0]==end[0] && c[1]==end[1]) return true;",
    "            for (int[] d : dirs) {",
    "                int nr=c[0]+d[0], nc=c[1]+d[1];",
    "                if (nr>=0&&nr<rows&&nc>=0&&nc<cols)",
    "                    if (grid[nr][nc]!=1&&!vis[nr][nc]) {",
    "                        vis[nr][nc]=true;",
    "                        q.add(new int[]{nr,nc});",
    "                    }",
    "            }",
    "        }",
    "        return false;",
    "    }",
    "}",
  ].join("\n"),

  cpp: [
    "class Solution {",
    "public:",
    "    bool bfs(vector<vector<int>>& grid, pair<int,int> s, pair<int,int> e) {",
    "        int R=grid.size(), C=grid[0].size();",
    "        queue<pair<int,int>> q;",
    "        vector<vector<bool>> vis(R, vector<bool>(C,false));",
    "        q.push(s); vis[s.first][s.second]=true;",
    "        vector<pair<int,int>> dirs={{-1,0},{1,0},{0,-1},{0,1}};",
    "        while(!q.empty()) {",
    "            auto [r,c]=q.front(); q.pop();",
    "            if(r==e.first&&c==e.second) return true;",
    "            for(auto [dr,dc]:dirs) {",
    "                int nr=r+dr, nc=c+dc;",
    "                if(nr>=0&&nr<R&&nc>=0&&nc<C)",
    "                    if(grid[nr][nc]!=1&&!vis[nr][nc]) {",
    "                        vis[nr][nc]=true; q.push({nr,nc});",
    "                    }",
    "            }",
    "        }",
    "        return false;",
    "    }",
    "};",
  ].join("\n"),
};

export const bfsGraph: VisualizableAlgorithm<GridInput> = {
  id: "bfs-graph",
  name: "BFS Pathfinding",
  category: "Graphs",
  difficulty: "Medium",
  description:
    "Find the shortest path in an unweighted grid using Breadth-First Search (BFS).",

  sourceCode: BFS_SOURCE,
  language: "typescript",
  tags: ["graph", "bfs", "shortest-path", "grid"],
  defaultInput: JSON.stringify({
    rows: 5,
    cols: 7,
    start: [0, 0],
    end: [4, 6],
    walls: [
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 0],
      [3, 4],
      [4, 4],
      [2, 4],
      [2, 5],
    ],
  }),

  parseInput(raw: unknown): GridInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as GridInput;
  },

  validateInput(input: GridInput) {
    if (!input.rows || !input.cols)
      return { valid: false, error: "Missing rows/cols" };
    if (!input.start || !input.end)
      return { valid: false, error: "Missing start/end" };
    return { valid: true };
  },

  initialVisualizationState(input: GridInput): VisualizationState {
    const grid: GridCell[][] = [];
    for (let r = 0; r < input.rows; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < input.cols; c++) {
        row.push({ row: r, col: c, type: "empty", state: "default" });
      }
      grid.push(row);
    }
    if (input.walls) {
      input.walls.forEach(([r, c]) => {
        if (r >= 0 && r < input.rows && c >= 0 && c < input.cols) {
          grid[r][c].type = "wall";
        }
      });
    }
    const [sr, sc] = input.start;
    grid[sr][sc].type = "start";
    const [er, ec] = input.end;
    grid[er][ec].type = "end";
    return { type: "grid", grid };
  },

  execute(input: GridInput): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];

    const grid: GridCell[][] = [];
    for (let r = 0; r < input.rows; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < input.cols; c++) {
        row.push({ row: r, col: c, type: "empty", state: "default" });
      }
      grid.push(row);
    }
    if (input.walls) {
      input.walls.forEach(([r, c]) => {
        if (r >= 0 && r < input.rows && c >= 0 && c < input.cols)
          grid[r][c].type = "wall";
      });
    }
    grid[input.start[0]][input.start[1]].type = "start";
    grid[input.end[0]][input.end[1]].type = "end";

    const buildState = (
      current?: [number, number]
    ): VisualizationState => ({
      type: "grid",
      grid: JSON.parse(JSON.stringify(grid)),
      current: current ? { row: current[0], col: current[1] } : undefined,
    });

    const queue: [number, number][] = [
      [input.start[0], input.start[1]],
    ];
    const visited = new Set<string>();
    visited.add(input.start[0] + "," + input.start[1]);

    const parent = new Map<string, string>();

    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    steps.push(
      step()
        .viz(buildState())
        .explain("Initialize BFS queue with the start node.")
        .line(4)
        .build()
    );

    let found = false;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const [r, c] = curr;

      if (grid[r][c].type !== "start") {
        grid[r][c].state = "current";
      }

      steps.push(
        step()
          .viz(buildState(curr))
          .explain(
            "Dequeue node (" + r + ", " + c + "). Checking if it's the target."
          )
          .line(9)
          .build()
      );

      if (r === input.end[0] && c === input.end[1]) {
        found = true;
        steps.push(
          step()
            .viz(buildState(curr))
            .explain("Target found at (" + r + ", " + c + ")!")
            .line(10)
            .build()
        );
        break;
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const key = nr + "," + nc;

        if (
          nr >= 0 &&
          nr < input.rows &&
          nc >= 0 &&
          nc < input.cols
        ) {
          if (grid[nr][nc].type !== "wall" && !visited.has(key)) {
            visited.add(key);
            parent.set(key, r + "," + c);
            queue.push([nr, nc]);

            if (grid[nr][nc].type !== "end") {
              grid[nr][nc].state = "exploring";
            }

            steps.push(
              step()
                .viz(buildState(curr))
                .explain(
                  "Neighbor (" +
                    nr +
                    ", " +
                    nc +
                    ") is valid and unvisited. Enqueue it."
                )
                .line(16)
                .build()
            );
          }
        }
      }

      if (grid[r][c].type !== "start" && grid[r][c].type !== "end") {
        grid[r][c].state = "visited";
      }
    }

    if (found) {
      let currKey = input.end[0] + "," + input.end[1];
      const path: string[] = [];
      const startKey = input.start[0] + "," + input.start[1];
      while (currKey && currKey !== startKey) {
        path.push(currKey);
        currKey = parent.get(currKey)!;
      }

      for (const p of path.reverse()) {
        const [pr, pc] = p.split(",").map(Number);
        if (grid[pr][pc].type !== "end") {
          grid[pr][pc].state = "path";
        }
      }
      steps.push(
        step()
          .viz(buildState())
          .explain(
            "Reconstructed shortest path from target back to start."
          )
          .line(22)
          .build()
      );
    } else {
      steps.push(
        step()
          .viz(buildState())
          .explain(
            "Queue is empty and target was not found. No path exists."
          )
          .line(22)
          .build()
      );
    }

    return steps;
  },

  complexity: {
    time: "O(V + E)",
    space: "O(V)",
    timeDescription: "Vertices are cells, edges are neighbors.",
    spaceDescription: "Queue and visited set can hold up to V nodes.",
  },

  visualizationType: "grid",
};
