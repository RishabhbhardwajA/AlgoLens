export interface SeoAlgorithmEntry {
  id: string;
  name: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  tags: string[];
  lastModified: string;
}

export interface StaticPublicRouteSeo {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  lastModified: string;
}

export const SITE_LAST_MODIFIED = "2026-10-19";

export const PUBLIC_ALGORITHMS: SeoAlgorithmEntry[] = [
  {
    id: "linear-search",
    name: "Linear Search",
    category: "Arrays",
    difficulty: "Easy",
    description: "Scan each element sequentially until the target is found.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["array", "search", "linear"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "binary-search",
    name: "Binary Search",
    category: "Arrays",
    difficulty: "Easy",
    description: "Eliminate half the search space at each step using a sorted array.",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    tags: ["array", "search", "divide-and-conquer"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "two-sum-ii",
    name: "Two Sum II",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Find two numbers in a sorted array that sum to a target using two pointers.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "sorted"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "reverse-string",
    name: "Reverse String",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Reverse an array of characters in-place using two pointers.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "string", "in-place"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "move-zeroes",
    name: "Move Zeroes",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Move all zeroes in an array to the end while maintaining the relative order of non-zero elements.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "in-place"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "remove-duplicates",
    name: "Remove Duplicates",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Remove duplicates from a sorted array in-place, returning the new length.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "in-place", "sorted"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "squares-of-sorted-array",
    name: "Squares of Sorted Array",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Return an array of the squares of each number sorted in non-decreasing order.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    tags: ["two-pointer", "array", "math", "sorted"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "valid-palindrome",
    name: "Valid Palindrome",
    category: "Two Pointer",
    difficulty: "Easy",
    description: "Check if a string is a palindrome using two pointers.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "string", "easy"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "container-with-most-water",
    name: "Container With Most Water",
    category: "Two Pointer",
    difficulty: "Medium",
    description: "Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["two-pointer", "array", "greedy", "medium"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "bubble-sort",
    name: "Bubble Sort",
    category: "Sorting",
    difficulty: "Easy",
    description: "Repeatedly swap adjacent elements until the array is sorted.",
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    tags: ["sort", "comparison", "in-place"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "insertion-sort",
    name: "Insertion Sort",
    category: "Sorting",
    difficulty: "Easy",
    description: "Build a sorted array one element at a time by inserting into the correct position.",
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    tags: ["sort", "comparison", "in-place"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "merge-sort",
    name: "Merge Sort",
    category: "Sorting",
    difficulty: "Medium",
    description: "Divide and conquer sorting algorithm that recursively splits the array in half, sorts each half, then merges them.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
    tags: ["sort", "recursion", "divide-and-conquer", "stable"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "tree-height",
    name: "Height of Binary Tree",
    category: "Trees",
    difficulty: "Easy",
    description: "Find the maximum depth of a binary tree using recursion.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(h)",
    tags: ["tree", "recursion", "dfs", "depth"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "tree-traversal",
    name: "Tree Traversal",
    category: "Trees",
    difficulty: "Easy",
    description: "Traverse a binary tree in Inorder, Preorder, or Postorder.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(h)",
    tags: ["tree", "recursion", "traversal", "dfs"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "invert-tree",
    name: "Invert Binary Tree",
    category: "Trees",
    difficulty: "Easy",
    description: "Recursively invert a binary tree, swapping left and right children at each node.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(h)",
    tags: ["tree", "recursion", "dfs"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "level-order",
    name: "Level Order Traversal",
    category: "Trees",
    difficulty: "Medium",
    description: "Traverse a binary tree level by level using a queue (BFS).",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    tags: ["tree", "bfs", "queue", "traversal"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "bst-search",
    name: "BST Search",
    category: "Trees",
    difficulty: "Easy",
    description: "Search for a value in a Binary Search Tree by recursively going left or right based on comparisons.",
    timeComplexity: "O(h)",
    spaceComplexity: "O(h)",
    tags: ["tree", "bst", "recursion", "search"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "fibonacci",
    name: "Fibonacci",
    category: "Recursion",
    difficulty: "Easy",
    description: "Compute Fibonacci numbers using naive recursion to visualize the call tree.",
    timeComplexity: "O(2ⁿ)",
    spaceComplexity: "O(n)",
    tags: ["recursion", "fibonacci", "dp"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "factorial",
    name: "Factorial",
    category: "Recursion",
    difficulty: "Easy",
    description: "Compute n! using recursion. Visualizes the call stack building up and unwinding with return values.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    tags: ["recursion", "math", "factorial"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "bfs-graph",
    name: "BFS Pathfinding",
    category: "Graphs",
    difficulty: "Medium",
    description: "Find the shortest path in a grid using Breadth-First Search (BFS).",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    tags: ["graph", "bfs", "shortest-path"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "reverse-linked-list",
    name: "Reverse Linked List",
    category: "Linked List",
    difficulty: "Easy",
    description: "Reverse a singly linked list in-place by flipping pointers sequentially.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["linked-list", "two-pointer", "in-place", "pointers"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "detect-cycle",
    name: "Linked List Cycle (Floyd's)",
    category: "Linked List",
    difficulty: "Easy",
    description: "Detect whether a linked list contains a cycle using Floyd's Tortoise and Hare algorithm.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tags: ["linked-list", "two-pointer", "fast-slow", "cycle"],
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    id: "climbing-stairs",
    name: "Climbing Stairs (Recursion to DP)",
    category: "Dynamic Programming",
    difficulty: "Easy",
    description: "Learn the transition from naive 2ⁿ branching recursion to linear O(n) DP tabulation.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    tags: ["dynamic-programming", "memoization", "recursion", "tabulation"],
    lastModified: SITE_LAST_MODIFIED,
  },
];

export const STATIC_PUBLIC_ROUTES: StaticPublicRouteSeo[] = [
  {
    path: "/",
    title: "AlgoLens — Interactive DSA Visualizer & Step-by-Step Debugger",
    description:
      "See algorithms think in real-time. Step through Data Structures and Algorithms with live memory visualization, OpenJDK JDI traces, Big-O comparison races, and Socratic AI tutoring.",
    keywords: [
      "DSA visualizer",
      "algorithm visualization",
      "data structures and algorithms",
      "step by step debugger",
      "Java JDI trace",
      "binary search visualizer",
      "tree traversal animation",
      "AlgoLens",
    ],
    ogImage: "/og-image.png",
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    path: "/explore",
    title: "Algorithm Explorer — 23 Interactive DSA Visualizers | AlgoLens",
    description:
      "Browse interactive visualizers across Arrays, Two Pointers, Sorting, Binary Trees, Recursion, Linked Lists, Graphs, and Dynamic Programming with Big-O complexity guides.",
    keywords: [
      "algorithm explorer",
      "DSA problems visualizer",
      "sorting visualization",
      "tree algorithms",
      "graph traversal",
      "dynamic programming visualizer",
    ],
    ogImage: "/og/explore.png",
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    path: "/playground",
    title: "Multi-Language Sandbox & Java JDI Debugger | AlgoLens",
    description:
      "Execute Java, Python, C++, and JavaScript code online or step through live OpenJDK JDI traces with stack frames, local variables, and array pointer visualization.",
    keywords: [
      "Java JDI debugger",
      "online code visualizer",
      "step by step Java trace",
      "DSA code sandbox",
    ],
    ogImage: "/og/playground.png",
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    path: "/race",
    title: "Algorithm Big-O Race — Side-by-Side Complexity Comparison | AlgoLens",
    description:
      "Race sorting and searching algorithms simultaneously on identical inputs to observe real step counts, comparisons, swaps, and asymptotic Big-O performance.",
    keywords: [
      "Big-O comparison",
      "algorithm race",
      "bubble sort vs merge sort",
      "linear search vs binary search",
    ],
    ogImage: "/og/race.png",
    lastModified: SITE_LAST_MODIFIED,
  },
  {
    path: "/builder",
    title: "Interactive Graph Builder — BFS, DFS & Dijkstra Visualizer | AlgoLens",
    description:
      "Build custom directed and weighted graphs interactively and step through BFS, DFS, and Dijkstra shortest-path algorithms with distance tables.",
    keywords: [
      "graph algorithm visualizer",
      "Dijkstra visualizer",
      "BFS DFS graph builder",
      "shortest path visualization",
    ],
    ogImage: "/og/builder.png",
    lastModified: SITE_LAST_MODIFIED,
  },
];

export const PRIVATE_NOINDEX_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/profile",
]);

export function findAlgorithmSeo(id: string): SeoAlgorithmEntry | undefined {
  return PUBLIC_ALGORITHMS.find((alg) => alg.id === id);
}
