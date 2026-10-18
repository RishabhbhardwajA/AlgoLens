import type { LanguageCapability } from "../../types/execution.js";

export interface SupportedLanguageConfig extends LanguageCapability {
  judge0Id: number;
  aliases: string[];
  fileExtension: string;
  defaultBoilerplate: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageConfig[] = [
  {
    language: "java",
    displayName: "Java",
    version: "OpenJDK 17 / 24",
    judge0Id: 91, // Standard Judge0 CE Java 17
    aliases: ["java", "openjdk"],
    fileExtension: ".java",
    supportsRun: true,
    supportsTrace: true,
    limitations: [
      "Tracer requires class Solution with public static void main(String[] args)",
      "Infinite recursion or execution > 500 steps will be truncated",
      "Network calls and raw file system modifications are strictly blocked in sandbox",
    ],
    defaultBoilerplate: `public class Solution {
    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11, 13, 17, 19, 23};
        int target = 13;
        int result = binarySearch(arr, target);
        System.out.println("Result index: " + result);
    }

    public static int binarySearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }
}`,
  },
  {
    language: "python",
    displayName: "Python",
    version: "3.11 / 3.13",
    judge0Id: 92, // Judge0 CE Python 3.11
    aliases: ["py", "python", "python3"],
    fileExtension: ".py",
    supportsRun: true,
    supportsTrace: false, // Tracer planned for Phase 6
    limitations: [
      "Trace mode is planned for Phase 6 using sys.settrace",
      "Run mode executes full Python syntax and prints actual stdout/stderr",
    ],
    defaultBoilerplate: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

if __name__ == "__main__":
    nums = [1, 3, 5, 7, 9, 11, 13, 17, 19, 23]
    ans = binary_search(nums, 13)
    print("Found target at index:", ans)`,
  },
  {
    language: "cpp",
    displayName: "C++",
    version: "GCC 11.2 / 13.2",
    judge0Id: 76, // Judge0 CE C++ (GCC 11.2.0)
    aliases: ["cpp", "c++", "cplusplus"],
    fileExtension: ".cpp",
    supportsRun: true,
    supportsTrace: false, // Tracer planned for Phase 6
    limitations: [
      "Trace mode is planned for Phase 6 using GDB/MI",
      "Run mode compiles and executes C++20 with full STL support",
    ],
    defaultBoilerplate: `#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    std::vector<int> nums = {1, 3, 5, 7, 9, 11, 13, 17, 19, 23};
    int idx = binarySearch(nums, 13);
    std::cout << "Target index: " << idx << std::endl;
    return 0;
}`,
  },
  {
    language: "javascript",
    displayName: "JavaScript (Node.js)",
    version: "Node.js 18 / 22",
    judge0Id: 93, // Judge0 CE Node.js 18.15
    aliases: ["js", "javascript", "node"],
    fileExtension: ".js",
    supportsRun: true,
    supportsTrace: false,
    limitations: [
      "Run mode executes via Node.js runtime",
      "Client-side JavaScript also has instant tracing in AlgoLens Web Worker",
    ],
    defaultBoilerplate: `function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

const nums = [1, 3, 5, 7, 9, 11, 13, 17, 19, 23];
console.log("Target index:", binarySearch(nums, 13));`,
  },
];

export function resolveLanguage(inputLang: string): SupportedLanguageConfig | undefined {
  const normalized = (inputLang || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.find(
    (item) => item.language === normalized || item.aliases.includes(normalized)
  );
}

export function getLanguageCapabilities(): LanguageCapability[] {
  return SUPPORTED_LANGUAGES.map(({ judge0Id, aliases, fileExtension, defaultBoilerplate, ...cap }) => cap);
}
