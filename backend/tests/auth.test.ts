import { userRepository, sanitizeUser } from "../src/repositories/userRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/services/authService.js";

async function runAuthTests() {
  console.log("=== STARTING BACKEND AUTH & REPOSITORY TESTS ===");

  const testEmail = `student_${Date.now()}@example.com`;
  const testPassword = "SecurePassword123!";
  const testName = "Maya Lin";

  // 1. User Creation
  console.log("\n[Test 1] Testing User Registration & Password Hashing...");
  const passwordHash = await bcrypt.hash(testPassword, 10);
  const user = userRepository.createUser({
    name: testName,
    email: testEmail,
    password_hash: passwordHash,
  });
  if (!user.id || user.email !== testEmail) {
    throw new Error("User creation failed!");
  }
  console.log("✓ User created:", user.id, user.name, user.email);

  // 2. Lookup
  console.log("\n[Test 2] Testing User Lookup by Email...");
  const found = userRepository.findUserByEmail(testEmail);
  if (!found || found.id !== user.id) {
    throw new Error("User lookup failed!");
  }
  console.log("✓ User found by email:", found.email);

  // 3. Verification
  console.log("\n[Test 3] Testing Bcrypt Password Verification...");
  const isMatch = await bcrypt.compare(testPassword, found.password_hash);
  const badMatch = await bcrypt.compare("WrongPass", found.password_hash);
  if (!isMatch || badMatch) {
    throw new Error("Password verification failed!");
  }
  console.log("✓ Password matches and rejects incorrect credentials.");

  // 4. JWT
  console.log("\n[Test 4] Testing JWT Token Signing & Decoding...");
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
  const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  if (decoded.id !== user.id) {
    throw new Error("JWT payload mismatch!");
  }
  console.log("✓ JWT signed and verified successfully.");

  // 5. Bookmarks
  console.log("\n[Test 5] Testing Bookmark Operations...");
  userRepository.addBookmark(user.id, "binary-search");
  userRepository.addBookmark(user.id, "two-sum-ii");
  let bookmarks = userRepository.getBookmarks(user.id);
  if (!bookmarks.includes("binary-search") || !bookmarks.includes("two-sum-ii")) {
    throw new Error("Bookmark persistence failed!");
  }
  userRepository.removeBookmark(user.id, "binary-search");
  bookmarks = userRepository.getBookmarks(user.id);
  if (bookmarks.includes("binary-search") || !bookmarks.includes("two-sum-ii")) {
    throw new Error("Bookmark removal failed!");
  }
  console.log("✓ Bookmarks add/remove verified:", bookmarks);

  // 6. Progress
  console.log("\n[Test 6] Testing Learning Progress...");
  const prog = userRepository.recordProgress(user.id, "binary-search", {
    completed: true,
    quiz_score: 95,
    steps_explored: 12,
  });
  if (prog.completed !== 1 || prog.quiz_score !== 95) {
    throw new Error("Progress record mismatch!");
  }
  console.log("✓ Progress recorded:", prog.algorithm_id, "score:", prog.quiz_score);

  // 7. Snippets
  console.log("\n[Test 7] Testing Saved Code Snippets...");
  const snippet = userRepository.createSnippet(user.id, {
    title: "Binary Search Custom",
    code: "function bSearch(arr) { return 0; }",
    input_data: "[1, 2, 3]",
    algorithm_category: "Arrays",
  });
  const snippets = userRepository.getSnippets(user.id);
  if (snippets.length === 0 || snippets[0].id !== snippet.id) {
    throw new Error("Snippet persistence failed!");
  }
  console.log("✓ Snippet saved:", snippet.title);

  // 8. Profile
  console.log("\n[Test 8] Testing Profile Updates...");
  const updated = userRepository.updateProfile(user.id, {
    bio: "Prepping for Tech Interviews",
  });
  if (updated?.bio !== "Prepping for Tech Interviews") {
    throw new Error("Profile update failed!");
  }
  console.log("✓ Profile updated:", sanitizeUser(updated).bio);

  console.log("\n🎉 ALL 8 BACKEND REPOSITORY & AUTH TESTS PASSED!");
}

runAuthTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
