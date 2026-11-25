export interface PresetItem {
  name: string;
  code: string;
  array: string;
  description: string;
}

export const MULTI_LANG_PRESETS: Record<string, Record<string, PresetItem>> = {
  java: {
    java_binarySearch: {
      name: "Java: Binary Search",
      array: "[2, 4, 6, 8, 10, 12, 14, 16]",
      description: "Binary search in Java inspected via OpenJDK JDI debugger.",
      code: `public class Solution {
    public static int binarySearch(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] data = { 2, 4, 6, 8, 10, 12, 14, 16 };
        int target = 10;
        int result = binarySearch(data, target);
        System.out.println("Found target " + target + " at index: " + result);
    }
}`,
    },
    java_loopSum: {
      name: "Java: Array Loop & Sum",
      array: "[5, 10, 15, 20, 25]",
      description: "Array iteration and accumulator variable tracing.",
      code: `public class Solution {
    public static void main(String[] args) {
        int[] arr = { 5, 10, 15, 20, 25 };
        int sum = 0;
        for (int i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        System.out.println("Final Sum: " + sum);
    }
}`,
    },
    java_factorial: {
      name: "Java: Recursive Factorial",
      array: "[1, 2, 3, 4, 5]",
      description: "Recursive function call stack inspection.",
      code: `public class Solution {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int n = 4;
        int ans = factorial(n);
        System.out.println("Factorial of " + n + " = " + ans);
    }
}`,
    },
  },
  python: {
    py_twoSum: {
      name: "Python: Two Sum",
      array: "[2, 7, 11, 15]",
      description: "Two Sum hash map lookup in Python.",
      code: `def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []

nums = [2, 7, 11, 15]
target = 9
result = two_sum(nums, target)
print(f"Indices for target {target}: {result}")
`,
    },
    py_binarySearch: {
      name: "Python: Binary Search",
      array: "[1, 3, 5, 7, 9, 11]",
      description: "Binary search in Python.",
      code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

data = [1, 3, 5, 7, 9, 11]
target = 7
idx = binary_search(data, target)
print(f"Target {target} found at index {idx}")
`,
    },
  },
  cpp: {
    cpp_vector: {
      name: "C++: Vector Sum",
      array: "[10, 20, 30, 40]",
      description: "C++ standard library vector accumulation.",
      code: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = { 10, 20, 30, 40 };
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Vector sum: " << total << std::endl;
    return 0;
}
`,
    },
  },
  javascript: {
    peakElement: {
      name: "JS: Peak Element",
      array: "[1, 3, 20, 4, 1, 0]",
      description: "Binary search to find peak element where arr[i] > arr[i+1].",
      code: `// Find Peak Element using Binary Search
let low = 0;
let high = arr.length - 1;

while (low < high) {
  let mid = Math.floor((low + high) / 2);
  tracer.pointer("low", low);
  tracer.pointer("mid", mid);
  tracer.pointer("high", high);

  tracer.explain(\`Checking mid index \${mid} (val: \${arr[mid]}) against mid+1 (\${arr[mid + 1]})\`);

  if (tracer.compare(mid, mid + 1)) {
    tracer.explain("Left element is greater -> peak lies in left subarray");
    high = mid;
  } else {
    tracer.explain("Right element is greater -> peak lies in right subarray");
    low = mid + 1;
  }
}

tracer.pointer("peak", low);
tracer.result(low, \`Peak element found at index \${low} with value \${arr[low]}!\`);
return low;`,
    },
    bubbleSort: {
      name: "JS: Bubble Sort",
      array: "[29, 10, 14, 37, 14, 2, 45, 18]",
      description: "Classic adjacent comparisons and bubbling of maximums.",
      code: `// Bubble Sort Implementation
for (let i = 0; i < arr.length; i++) {
  tracer.pointer("i", i);
  for (let j = 0; j < arr.length - i - 1; j++) {
    tracer.pointer("j", j);
    if (tracer.compare(j, j + 1)) {
      tracer.swap(j, j + 1);
    }
  }
}
tracer.result(arr, "Bubble Sort completed! Array is fully sorted.");
return arr;`,
    },
  },
};
