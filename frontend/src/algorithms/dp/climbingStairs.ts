import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { resolveSourceLine, getAlgorithmSource } from "@/utils/sourceLineMapper";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  VisualizationState,
  ArrayElement,
  CallFrame,
} from "@/engine/executionTypes";

type ClimbingStairsInput = { n: number };

function buildDpState(
  dp: (number | null)[],
  currentIdx: number | null,
  prev1: number | null,
  prev2: number | null,
  isFinished = false
): VisualizationState {
  const elements: ArrayElement[] = dp.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    let label: string | undefined = undefined;

    if (isFinished && index === dp.length - 1) {
      state = "found";
      label = "ans";
    } else if (index === currentIdx) {
      state = "current";
      label = `dp[${index}]`;
    } else if (index === prev1) {
      state = "pointer-left";
      label = "i-1";
    } else if (index === prev2) {
      state = "pointer-right";
      label = "i-2";
    } else if (value !== null) {
      state = "visited";
    }

    return {
      value: value !== null ? value : "?",
      index,
      state,
      label,
    };
  });

  const pointers: Record<string, number> = {};
  if (currentIdx !== null) pointers["i"] = currentIdx;
  if (prev1 !== null) pointers["i-1"] = prev1;
  if (prev2 !== null) pointers["i-2"] = prev2;

  return { type: "array", elements, pointers };
}

export const climbingStairs: VisualizableAlgorithm<ClimbingStairsInput> = {
  id: "climbing-stairs",
  name: "Climbing Stairs (Recursion to DP)",
  category: "Dynamic Programming",
  difficulty: "Easy",
  description:
    "Learn the transition from naive 2ⁿ branching recursion to linear O(n) DP tabulation.",

  sourceCode: {
    typescript: `function climbStairs(n: number): number {
  if (n <= 1) return 1;

  // 1. Initialize DP table (memoizing base cases)
  const dp: number[] = new Array(n + 1).fill(0);
  dp[0] = 1;
  dp[1] = 1;

  // 2. Tabulation: fill bottom-up from smallest subproblems
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  // 3. Return total distinct ways to reach top
  return dp[n];
}`,
    python: `def climbStairs(n: int) -> int:
    if n <= 1:
        return 1
        
    dp = [0] * (n + 1)
    dp[0] = 1
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
        
    return dp[n]`,
    java: `class Solution {
    public int climbStairs(int n) {
        if (n <= 1) return 1;
        
        int[] dp = new int[n + 1];
        dp[0] = 1;
        dp[1] = 1;
        
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        
        return dp[n];
    }
}`,
    cpp: `class Solution {
public:
    int climbStairs(int n) {
        if (n <= 1) return 1;
        
        vector<int> dp(n + 1, 0);
        dp[0] = 1;
        dp[1] = 1;
        
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        
        return dp[n];
    }
};`,
  },

  language: "typescript",
  defaultInput: JSON.stringify({ n: 5 }),

  parseInput(raw: unknown): ClimbingStairsInput {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "number") return { n: parsed };
        if (typeof parsed?.n === "number") return { n: parsed.n };
      } catch {
        const num = parseInt(raw, 10);
        if (!isNaN(num)) return { n: num };
      }
    }
    if (typeof raw === "number") return { n: raw };
    return raw as ClimbingStairsInput;
  },

  validateInput(input: ClimbingStairsInput) {
    if (typeof input?.n !== "number" || isNaN(input.n)) {
      return { valid: false, error: "Input n must be an integer" };
    }
    if (input.n < 1) {
      return { valid: false, error: "n must be >= 1" };
    }
    if (input.n > 12) {
      return { valid: false, error: "n must be <= 12 to preserve visualization clarity" };
    }
    return { valid: true };
  },

  initialVisualizationState(input: ClimbingStairsInput): VisualizationState {
    const arr = new Array(input.n + 1).fill(null);
    return buildDpState(arr, null, null, null);
  },

  complexity: {
    time: "O(n)",
    space: "O(n)",
    timeDescription: "Linear pass fills each DP table entry once in O(1) time (vs O(2ⁿ) recursion)",
    spaceDescription: "1D array of size n+1 (can be space-optimized to O(1) two variables)",
  },

  visualizationType: "array",
  tags: ["dynamic-programming", "memoization", "recursion", "tabulation"],

  execute(input: ClimbingStairsInput): ExecutionStep[] {
    resetStepCounter();
    const { n } = input;
    const steps: ExecutionStep[] = [];

    const src = getAlgorithmSource(climbingStairs.sourceCode, climbingStairs.language);
    const lineEntry = resolveSourceLine(src, "function climbStairs", 1);
    const lineBase = resolveSourceLine(src, "dp[0] = 1;", 6);
    const lineRead = resolveSourceLine(src, "for (let i = 2", 10);
    const lineFill = resolveSourceLine(src, "dp[i] = dp[i - 1]", 11);
    const lineReturn = resolveSourceLine(src, "return dp[n];", 15);

    const sf = (line: number, vars: Record<string, unknown>): CallFrame =>
      frame("cs-0", "climbStairs", { n }, vars, line);

    // Initial DP table initialized with null
    const dp: (number | null)[] = new Array(n + 1).fill(null);

    // Step 1: Function entry & Recurrence explanation
    steps.push(
      step()
        .line(lineEntry)
        .fn("climbStairs")
        .event({ type: "CALL", functionName: "climbStairs", args: { n }, line: lineEntry })
        .callStack([sf(lineEntry, { n })])
        .variables({ n, stage: "1. Problem & Recurrence" })
        .viz(buildDpState(dp, null, null, null))
        .explain(
          `Climbing Stairs (n = ${n})\n\nStage 1: Problem Recurrence\nTo reach step n, you could have come from step (n - 1) via a 1-step jump or step (n - 2) via a 2-step jump.\n\nRecurrence: ways(n) = ways(n - 1) + ways(n - 2).`
        )
        .structured(
          `Analyzed recurrence relation for n = ${n}.`,
          `Every valid path to stair n ends in either a 1-step or 2-step jump.`,
          `Optimal Substructure: ways(n) = ways(n-1) + ways(n-2).`
        )
        .build()
    );

    // Step 2: Base cases
    dp[0] = 1;
    dp[1] = 1;

    steps.push(
      step()
        .line(lineBase)
        .fn("climbStairs")
        .event({ type: "UPDATE", variable: "dp[0], dp[1]", oldValue: undefined, newValue: 1, line: lineBase })
        .callStack([sf(lineBase, { n, "dp[0]": 1, "dp[1]": 1 })])
        .variables({ n, "dp[0]": 1, "dp[1]": 1, stage: "2. Base Cases" })
        .viz(buildDpState(dp, 1, null, null))
        .explain(
          `Stage 2: Base Cases & Memo Initialization\n\ndp[0] = 1 (1 way to stay at ground)\ndp[1] = 1 (1 way to take 1 step: [1])\n\nThese base cases seed the bottom-up DP table.`
        )
        .structured(
          `Initialized base cases: dp[0] = 1 and dp[1] = 1.`,
          `Base cases solve the smallest subproblems directly without recursion.`,
          `dp table prefix [0...1] is now solved and immutable.`
        )
        .build()
    );

    // Step 3 to N: Tabulation loop
    for (let i = 2; i <= n; i++) {
      const prev1 = i - 1;
      const prev2 = i - 2;
      const val1 = dp[prev1] as number;
      const val2 = dp[prev2] as number;
      const currentWays = val1 + val2;

      // 3A: Read previous subproblems
      steps.push(
        step()
          .line(lineRead)
          .fn("climbStairs")
          .event({
            type: "COMPARE",
            left: val1,
            right: val2,
            operator: "<=",
            result: true,
            line: lineRead,
          })
          .callStack([sf(lineRead, { n, i, "dp[i-1]": val1, "dp[i-2]": val2 })])
          .variables({
            i,
            "dp[i-1]": val1,
            "dp[i-2]": val2,
            computing: `dp[${i}] = ${val1} + ${val2}`,
          })
          .viz(buildDpState(dp, i, prev1, prev2))
          .explain(
            `Stage 4: Tabulation Step i = ${i}\n\nReading cached subproblems:\n• dp[${prev1}] = ${val1} ways\n• dp[${prev2}] = ${val2} ways\n\nNo repeated recursive calls needed! O(1) table lookup.`
          )
          .structured(
            `Reading precomputed subproblems: dp[${prev1}] = ${val1} and dp[${prev2}] = ${val2}.`,
            `In naive recursion, both would spawn independent recursive branches causing O(2ⁿ) explosion. With DP, we read both in O(1) time.`,
            `Avoiding redundant work: 0 repeated evaluations.`
          )
          .build()
      );

      // 3B: Fill dp[i]
      dp[i] = currentWays;

      steps.push(
        step()
          .line(lineFill)
          .fn("climbStairs")
          .event({
            type: "UPDATE",
            variable: `dp[${i}]`,
            oldValue: null,
            newValue: currentWays,
            line: lineFill,
          })
          .callStack([sf(lineFill, { n, i, [`dp[${i}]`]: currentWays })])
          .variables({
            i,
            [`dp[${i}]`]: currentWays,
            "dp[i-1]": val1,
            "dp[i-2]": val2,
          })
          .viz(buildDpState(dp, i, null, null))
          .explain(
            `Filled dp[${i}] = ${val1} + ${val2} = ${currentWays}.\n\nThere are ${currentWays} distinct ways to climb ${i} stairs.`
          )
          .structured(
            `Calculated dp[${i}] = ${val1} + ${val2} = ${currentWays}.`,
            `Summed all 1-step choices from stair ${prev1} and 2-step choices from stair ${prev2}.`,
            `Table prefix dp[0...${i}] is completely solved.`
          )
          .build()
      );
    }

    // Final Step: Return solution
    const answer = dp[n] as number;

    steps.push(
      step()
        .line(lineReturn)
        .fn("climbStairs")
        .event({ type: "RETURN", functionName: "climbStairs", value: answer, line: lineReturn })
        .callStack([sf(lineReturn, { n, result: answer })])
        .variables({
          n,
          result: answer,
          "Naive Recursion": "O(2ⁿ) Time, O(n) Stack",
          "DP Tabulation": "O(n) Time, O(n) Space",
        })
        .viz(buildDpState(dp, null, null, null, true))
        .explain(
          `Final Result: dp[${n}] = ${answer} distinct ways.\n\nStage 5: Complexity Comparison\n• Naive Recursion: O(2ⁿ) time, O(n) stack frames\n• Memoization: O(n) time, O(n) stack + map\n• Bottom-Up Tabulation: O(n) time, O(n) table (or O(1) space with 2 variables)\n\nZero call stack overflow risk!`
        )
        .structured(
          `Returned dp[${n}] = ${answer} distinct ways.`,
          `All subproblems were solved sequentially from 2 to ${n} in topological order.`,
          `Complexity: O(n) time, O(n) space. Time reduced exponentially from O(2ⁿ).`
        )
        .returns(answer)
        .build()
    );

    return steps;
  },
};
