import { userRepository } from "../repositories/userRepository.js";
import type { ProgressRecord, SnippetRecord } from "../types/index.js";

export const userService = {
  getBookmarks(userId: string): string[] {
    return userRepository.getBookmarks(userId);
  },

  addBookmark(userId: string, algorithmId: string): string[] {
    userRepository.addBookmark(userId, algorithmId.trim());
    return userRepository.getBookmarks(userId);
  },

  removeBookmark(userId: string, algorithmId: string): string[] {
    userRepository.removeBookmark(userId, algorithmId.trim());
    return userRepository.getBookmarks(userId);
  },

  getProgress(userId: string): ProgressRecord[] {
    return userRepository.getProgress(userId);
  },

  recordProgress(
    userId: string,
    algorithmId: string,
    data: { completed?: boolean; quiz_score?: number; steps_explored?: number }
  ): ProgressRecord {
    return userRepository.recordProgress(userId, algorithmId.trim(), data);
  },

  getSnippets(userId: string): SnippetRecord[] {
    return userRepository.getSnippets(userId);
  },

  saveSnippet(
    userId: string,
    data: { title: string; code: string; input_data?: string; algorithm_category?: string }
  ): SnippetRecord {
    return userRepository.createSnippet(userId, data);
  },

  deleteSnippet(userId: string, snippetId: string): boolean {
    return userRepository.deleteSnippet(userId, snippetId);
  },
};
