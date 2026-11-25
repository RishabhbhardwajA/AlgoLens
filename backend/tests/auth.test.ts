import { userRepository, sanitizeUser } from "../src/repositories/userRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, authService } from "../src/services/authService.js";
import { emailService } from "../src/services/emailService.js";

async function runAuthTests() {
  process.env.NODE_ENV = "test";
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
  if (!found.password_hash) {
    throw new Error("Expected password_hash for local user!");
  }
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

  // 9. Challenge Attempts & Weak Topic Analytics
  console.log("\n[Test 9] Testing Challenge Attempts & Weak Topic Analytics...");
  userRepository.recordChallengeAttempt(user.id, {
    algorithmId: "binary-search",
    stepIndex: 2,
    challengeType: "mid_prediction",
    selectedOption: "mid = 4",
    correctOption: "mid = 3",
    isCorrect: false,
    xpEarned: 0,
  });
  userRepository.recordChallengeAttempt(user.id, {
    algorithmId: "binary-search",
    stepIndex: 4,
    challengeType: "branch_prediction",
    selectedOption: "Found target",
    correctOption: "Found target",
    isCorrect: true,
    xpEarned: 100,
  });
  const cStats = userRepository.getChallengeStats(user.id);
  if (cStats.totalAttempts !== 2 || cStats.totalCorrect !== 1 || cStats.accuracyPercent !== 50) {
    throw new Error(`Challenge stats mismatch: ${JSON.stringify(cStats)}`);
  }
  const weakTopics = userRepository.getWeakTopicsAnalytics(user.id);
  if (weakTopics.length === 0 || weakTopics[0].mistakes !== 1) {
    throw new Error(`Weak topic aggregation mismatch: ${JSON.stringify(weakTopics)}`);
  }
  console.log(`✓ Challenge accuracy (${cStats.accuracyPercent}%) and weak topics analytics verified.`);

  // 10. Bookmarked Trace Snapshots
  console.log("\n[Test 10] Testing Bookmarked Trace Snapshots...");
  const tBookmark = userRepository.addTraceBookmark(user.id, {
    algorithmId: "binary-search",
    stepIndex: 5,
    stepSnapshot: JSON.stringify({ line: 10, variables: { left: 2, right: 3 } }),
    note: "Check loop boundary here",
  });
  const tBookmarks = userRepository.getTraceBookmarks(user.id);
  if (tBookmarks.length !== 1 || tBookmarks[0].id !== tBookmark.id) {
    throw new Error("Trace bookmark persistence failed!");
  }
  const deletedTBookmark = userRepository.removeTraceBookmark(user.id, tBookmark.id);
  if (!deletedTBookmark) {
    throw new Error("Trace bookmark deletion failed!");
  }
  console.log("✓ Bookmarked trace snapshot save & delete verified.");

  // 11. Google OAuth Account Linking (local <-> google -> both)
  console.log("\n[Test 11] Testing Google OAuth Account Linking...");
  const googleRes1 = authService.findOrLinkGoogleAccount({
    googleId: `gid_${Date.now()}`,
    email: testEmail,
    name: "Maya Linked",
    avatarUrl: "https://example.com/avatar.png",
  });
  if (googleRes1.user.auth_provider !== "both" || !googleRes1.user.is_email_verified) {
    throw new Error(`Expected linked 'both' verified account, got ${JSON.stringify(googleRes1.user)}`);
  }

  // Also test reverse link: new Google user -> registers local password via OTP -> 'both'
  const gOnlyEmail = `google_only_${Date.now()}@example.com`;
  const googleOnly = authService.findOrLinkGoogleAccount({
    googleId: `gid_only_${Date.now()}`,
    email: gOnlyEmail,
    name: "Google First",
  });
  if (googleOnly.user.auth_provider !== "google") {
    throw new Error("Expected auth_provider='google' for Google-only user");
  }
  await authService.register({ name: "Google First", email: gOnlyEmail, password: "Password123!" });
  const linkOtp = emailService.getLastTestOtp(gOnlyEmail);
  if (!linkOtp) throw new Error("Expected OTP generated for linking local password");
  const linkedBoth = await authService.verifyOtp({ email: gOnlyEmail, otp: linkOtp });
  if (linkedBoth.user.auth_provider !== "both" || linkedBoth.user.id !== googleOnly.user.id) {
    throw new Error("Expected reverse linking from Google-only to 'both' preserving user ID");
  }
  console.log("✓ Bidirectional Google <-> Email/Password account linking verified.");

  console.log("\n🎉 ALL 11 BACKEND REPOSITORY & AUTH TESTS PASSED!");
}

runAuthTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
