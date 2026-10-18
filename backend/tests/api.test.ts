import app from "../src/app.js";
import http from "node:http";

async function runApiTests() {
  console.log("=== STARTING BACKEND HTTP & VALIDATION TESTS ===");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5188, resolve));
  const baseUrl = "http://localhost:5188/api";

  try {
    // 1. Health & Headers
    console.log("\n[Test 1] Testing Health Endpoint & OWASP Headers...");
    const healthRes = await fetch(`${baseUrl}/health`);
    if (healthRes.headers.get("x-content-type-options") !== "nosniff") {
      throw new Error("Missing X-Content-Type-Options: nosniff header!");
    }
    if (healthRes.headers.get("x-frame-options") !== "DENY") {
      throw new Error("Missing X-Frame-Options: DENY header!");
    }
    const csp = healthRes.headers.get("content-security-policy");
    if (!csp || !csp.includes("connect-src") || !csp.includes("worker-src")) {
      throw new Error("Missing or incomplete Content-Security-Policy header!");
    }
    console.log("✓ Security & Content-Security-Policy headers verified.");

    // 2. Data Validation
    console.log("\n[Test 2] Testing Data Validation on Invalid Register...");
    const badRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "bad-email", password: "123" }),
    });
    if (badRegRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${badRegRes.status}`);
    }
    const badData = await badRegRes.json();
    console.log("✓ Validation caught invalid payload:", badData.details.length, "errors.");

    // 3. Valid Register
    console.log("\n[Test 3] Testing Valid Register...");
    const email = `testuser_${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Learner",
        email,
        password: "Password123!",
      }),
    });
    if (regRes.status !== 201) {
      throw new Error(`Expected 201 Created, got ${regRes.status}`);
    }
    const regData = await regRes.json();
    const token = regData.token;
    console.log("✓ Registered user with ID:", regData.user.id);

    // 4. Duplicate Check
    console.log("\n[Test 4] Testing Duplicate Email Prevention...");
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Learner",
        email,
        password: "Password123!",
      }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    }
    console.log("✓ Duplicate registration rejected with 409 Conflict.");

    // 5. Auth Middleware Protection
    console.log("\n[Test 5] Testing Auth Middleware on Protected Route...");
    const noAuthRes = await fetch(`${baseUrl}/auth/me`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${noAuthRes.status}`);
    }
    const withAuthRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (withAuthRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${withAuthRes.status}`);
    }
    console.log("✓ Protected route successfully verified bearer token.");

    // 6. Bookmarking
    console.log("\n[Test 6] Testing Bookmark Adding...");
    const bookmarkRes = await fetch(`${baseUrl}/user/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ algorithmId: "binary-search" }),
    });
    if (bookmarkRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${bookmarkRes.status}`);
    }
    console.log("✓ Bookmark persistence verified via API.");

    // 7. Login: Wrong Password
    console.log("\n[Test 7] Testing Login Rejection on Wrong Password...");
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "WrongPassword999!" }),
    });
    if (wrongPassRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for wrong password, got ${wrongPassRes.status}`);
    }
    console.log("✓ Invalid password correctly rejected with 401 Unauthorized.");

    // 8. Login: Valid Credentials
    console.log("\n[Test 8] Testing Successful Login with Valid Credentials...");
    const goodLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (goodLoginRes.status !== 200) {
      throw new Error(`Expected 200 OK for valid login, got ${goodLoginRes.status}`);
    }
    const goodLoginData = await goodLoginRes.json();
    if (!goodLoginData.token) {
      throw new Error("Missing token in valid login response!");
    }
    console.log("✓ Successful login returned authenticated JWT.");

    // 9. Tampered Token Rejection
    console.log("\n[Test 9] Testing Tampered / Invalid JWT Token Rejection...");
    const tamperedRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature" },
    });
    if (tamperedRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for tampered token, got ${tamperedRes.status}`);
    }
    console.log("✓ Tampered JWT token rejected with 401 Unauthorized.");

    // 10. Startup Environment Validation Tests (Risk 1)
    console.log("\n[Test 10] Testing Startup JWT Secret Production Rejection...");
    const { validateEnvironment } = await import("../src/config/env.js");

    // Case 10A: Production with missing JWT_SECRET
    let caughtMissing = false;
    try {
      validateEnvironment({ NODE_ENV: "production", JWT_SECRET: "" });
    } catch (e: any) {
      caughtMissing = true;
      if (!e.message.includes("JWT_SECRET environment variable is missing")) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!caughtMissing) throw new Error("Production mode failed to reject missing JWT_SECRET!");
    console.log("  ✓ Production startup rejected missing JWT_SECRET.");

    // Case 10B: Production with public example secret
    let caughtExample = false;
    try {
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "algolens-super-secret-jwt-key-2026",
      });
    } catch (e: any) {
      caughtExample = true;
      if (!e.message.includes("matches a documented public example string")) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!caughtExample) throw new Error("Production mode failed to reject example JWT_SECRET!");
    console.log("  ✓ Production startup rejected known public example JWT_SECRET.");

    // Case 10C: Production with short secret (< 32 chars)
    let caughtShort = false;
    try {
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "too_short_key",
      });
    } catch (e: any) {
      caughtShort = true;
      if (!e.message.includes("must be at least 32 characters long")) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!caughtShort) throw new Error("Production mode failed to reject short JWT_SECRET!");
    console.log("  ✓ Production startup rejected short (<32 chars) JWT_SECRET.");

    // Case 10D: Production with strong random 48-char secret
    const validProdConfig = validateEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "v9K8X2mP7qR4tY1wZ6bN3cD5fG8hJ0kL9sA2eD4fG6hJ8kL0",
    });
    if (validProdConfig.JWT_SECRET !== "v9K8X2mP7qR4tY1wZ6bN3cD5fG8hJ0kL9sA2eD4fG6hJ8kL0") {
      throw new Error("Valid production config was corrupted!");
    }
    console.log("  ✓ Production startup accepted strong 48-char JWT secret.");

    console.log("\n🎉 ALL BACKEND HTTP, SECURITY & VALIDATION TESTS PASSED!");
  } finally {
    server.close();
  }
}

runApiTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
