import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { binarySearch } from "./arrays/binarySearch";
import { linearSearch } from "./arrays/linearSearch";
import { twoSumII } from "./twoPointer/twoSumII";
import { reverseString } from "./twoPointer/reverseString";
import { moveZeroes } from "./twoPointer/moveZeroes";
import { removeDuplicates } from "./twoPointer/removeDuplicates";
import { squaresOfSortedArray } from "./twoPointer/squaresOfSortedArray";
import { containerWithMostWater } from "./twoPointer/containerWithMostWater";
import { validPalindrome } from "./twoPointer/validPalindrome";
import { bubbleSort } from "./sorting/bubbleSort";
import { insertionSort } from "./sorting/insertionSort";
import { mergeSort } from "./sorting/mergeSort";
import { treeHeight } from "./trees/treeHeight";
import { treeTraversal } from "./trees/treeTraversal";
import { levelOrder } from "./trees/levelOrder";
import { invertTree } from "./trees/invertTree";
import { bstSearch } from "./trees/bstSearch";
import { fibonacci } from "./recursion/fibonacci";
import { factorial } from "./recursion/factorial";
import { bfsGraph } from "./graphs/bfsGraph";
import { reverseLinkedList } from "./linkedList/reverseLinkedList";
import { detectCycle } from "./linkedList/detectCycle";
import { climbingStairs } from "./dp/climbingStairs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, VisualizableAlgorithm<any>> = {
  "linear-search": linearSearch,
  "binary-search": binarySearch,
  "two-sum-ii": twoSumII,
  "reverse-string": reverseString,
  "move-zeroes": moveZeroes,
  "remove-duplicates": removeDuplicates,
  "squares-of-sorted-array": squaresOfSortedArray,
  "container-with-most-water": containerWithMostWater,
  "valid-palindrome": validPalindrome,
  "bubble-sort": bubbleSort,
  "insertion-sort": insertionSort,
  "merge-sort": mergeSort,
  "tree-height": treeHeight,
  "tree-traversal": treeTraversal,
  "level-order": levelOrder,
  "invert-tree": invertTree,
  "bst-search": bstSearch,
  "fibonacci": fibonacci,
  "factorial": factorial,
  "bfs-graph": bfsGraph,
  "reverse-linked-list": reverseLinkedList,
  "detect-cycle": detectCycle,
  "climbing-stairs": climbingStairs,
};

export function getAlgorithm(id: string): VisualizableAlgorithm | undefined {
  return REGISTRY[id];
}

export function getAllAlgorithms(): VisualizableAlgorithm[] {
  return Object.values(REGISTRY);
}
