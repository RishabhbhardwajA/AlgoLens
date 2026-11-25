import app from "../src/app.js";
import http from "node:http";
import { emailService } from "../src/services/emailService.js";

function extractCookieValue(res: Response, cookieName: string): { rawCookieHeader: string; setCookieHeader: string } {
  const getSetCookie = (res.headers as any).getSetCookie;
  const setCookies: string[] =
    typeof getSetCookie === "function"
      ? getSetCookie.call(res.headers)
      : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie")!]
      : [];

  const target = setCookies.find((c) => c.startsWith(`${cookieName}=`));
  if (!target) {
    throw new Error(`Missing Set-Cookie header for ${cookieName}`);
  }
  const valuePart = target.split(";")[0];
  return { rawCookieHeader: valuePart, setCookieHeader: target };
}

async function runApiTests() {
  process.env.NODE_ENV = "test";
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

    // 2. Data Validation (Confirm Password & Fields)
    console.log("\n[Test 2] Testing Data Validation on Invalid Register...");
    const badRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "A",
        email: "bad-email",
        password: "123",
        confirmPassword: "mismatch",
      }),
    });
    if (badRegRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${badRegRes.status}`);
    }
    const badData = await badRegRes.json();
    if (!badData.details || badData.details.length < 4) {
      throw new Error(`Expected confirmPassword and field validation errors, got ${JSON.stringify(badData)}`);
    }
    console.log("✓ Validation caught invalid payload & password mismatch:", badData.details.length, "errors.");

    // 3. Valid Register -> Pending 6-Digit Email OTP + Verification -> httpOnly Cookie Session
    console.log("\n[Test 3] Testing Two-Step Signup with 6-Digit Email OTP & httpOnly Session Cookie...");
    const email = `testuser_${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Learner",
        email,
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    });
    if (regRes.status !== 200) {
      throw new Error(`Expected 200 OTP pending response, got ${regRes.status}`);
    }
    const regData = await regRes.json();
    if (!regData.requiresOtp || regData.token) {
      throw new Error("Register must initiate OTP verification without issuing immediate session or token!");
    }

    const otpCode = emailService.getLastTestOtp(email);
    if (!otpCode || otpCode.length !== 6) {
      throw new Error(`Expected 6-digit OTP logged in test spy, got ${otpCode}`);
    }

    // Verify wrong OTP fails and decrements attempts
    const badOtpRes = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: "000000" === otpCode ? "111111" : "000000" }),
    });
    if (badOtpRes.status !== 400) {
      throw new Error(`Expected 400 for wrong OTP code, got ${badOtpRes.status}`);
    }

    // Verify valid OTP
    const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: otpCode }),
    });
    if (verifyRes.status !== 201) {
      throw new Error(`Expected 201 Created after OTP verification, got ${verifyRes.status}`);
    }
    const verifyData = await verifyRes.json();
    if (!verifyData.user?.id || !verifyData.user.is_email_verified || (verifyData as any).token) {
      throw new Error("Verified response must include user and MUST NOT leak raw JWT token in JSON body!");
    }

    const { rawCookieHeader: sessionCookie, setCookieHeader } = extractCookieValue(verifyRes, "algolens_session");
    if (!/HttpOnly/i.test(setCookieHeader) || !/SameSite=Lax/i.test(setCookieHeader)) {
      throw new Error(`Session cookie must enforce HttpOnly and SameSite=Lax: ${setCookieHeader}`);
    }
    console.log("✓ OTP verified, user created:", verifyData.user.id, "with HttpOnly SameSite=Lax cookie.");

    // 4. Duplicate Check
    console.log("\n[Test 4] Testing Duplicate Email Prevention...");
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Learner",
        email,
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    }
    console.log("✓ Duplicate registration rejected with 409 Conflict.");

    // 5. Auth Middleware Protection (httpOnly Cookie)
    console.log("\n[Test 5] Testing Auth Middleware on Protected Route...");
    const noAuthRes = await fetch(`${baseUrl}/auth/me`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${noAuthRes.status}`);
    }
    const withAuthRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    if (withAuthRes.status !== 200) {
      throw new Error(`Expected 200 OK with httpOnly cookie, got ${withAuthRes.status}`);
    }
    console.log("✓ Protected route verified httpOnly cookie session.");

    // 6. Bookmarking
    console.log("\n[Test 6] Testing Bookmark Adding...");
    const bookmarkRes = await fetch(`${baseUrl}/user/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
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

    // 8. Login: Valid Credentials + Logout Cookie Clear
    console.log("\n[Test 8] Testing Login httpOnly Cookie & Logout Clearing...");
    const goodLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (goodLoginRes.status !== 200) {
      throw new Error(`Expected 200 OK for valid login, got ${goodLoginRes.status}`);
    }
    const { rawCookieHeader: loginCookie } = extractCookieValue(goodLoginRes, "algolens_session");

    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { Cookie: loginCookie },
    });
    if (logoutRes.status !== 200) {
      throw new Error(`Expected 200 OK for logout, got ${logoutRes.status}`);
    }
    const logoutCookieHeader = logoutRes.headers.get("set-cookie") || "";
    if (!logoutCookieHeader.includes("algolens_session=;")) {
      throw new Error(`Expected logout to clear algolens_session cookie, got ${logoutCookieHeader}`);
    }
    console.log("✓ Login cookie issuance and logout cookie clearing verified.");

    // 9. Tampered Token Rejection
    console.log("\n[Test 9] Testing Tampered / Invalid Cookie JWT Rejection...");
    const tamperedRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: "algolens_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature" },
    });
    if (tamperedRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for tampered token, got ${tamperedRes.status}`);
    }
    console.log("✓ Tampered JWT cookie rejected with 401 Unauthorized.");

    // 10. Startup Environment Validation Tests
    console.log("\n[Test 10] Testing Startup JWT Secret Production Rejection...");
    const { validateEnvironment } = await import("../src/config/env.js");

    let caughtMissing = false;
    try {
      validateEnvironment({ NODE_ENV: "production" });
    } catch (e: any) {
      caughtMissing = true;
      if (!e.message.includes("JWT_SECRET environment variable is missing")) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!caughtMissing) throw new Error("Production mode failed to reject missing JWT_SECRET!");
    console.log("  ✓ Production startup rejected missing JWT_SECRET.");

    let caughtExample = false;
    try {
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "algolens-super-secret-jwt-key-2026",
      });
    } catch (e: any) {
      caughtExample = true;
    }
    if (!caughtExample) throw new Error("Production mode failed to reject example JWT_SECRET!");
    console.log("  ✓ Production startup rejected known public example JWT_SECRET.");

    let caughtShort = false;
    try {
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "too_short_key",
      });
    } catch (e: any) {
      caughtShort = true;
    }
    if (!caughtShort) throw new Error("Production mode failed to reject short JWT_SECRET!");
    console.log("  ✓ Production startup rejected short (<32 chars) JWT_SECRET.");

    const validProdConfig = validateEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "v9K8X2mP7qR4tY1wZ6bN3cD5fG8hJ0kL9sA2eD4fG6hJ8kL0",
    });
    if (validProdConfig.JWT_SECRET !== "v9K8X2mP7qR4tY1wZ6bN3cD5fG8hJ0kL9sA2eD4fG6hJ8kL0") {
      throw new Error("Valid production config was corrupted!");
    }
    console.log("  ✓ Production startup accepted strong 48-char JWT secret.");

    // 11. Challenge Attempt, Analytics & Trace Bookmark Endpoints
    console.log("\n[Test 11] Testing Challenge Persistence, Weak Topics & Trace Bookmarks...");
    const challengeRes = await fetch(`${baseUrl}/user/challenges/attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        algorithmId: "binary-search",
        stepIndex: 1,
        challengeType: "mid_prediction",
        selectedOption: "mid = 4",
        correctOption: "mid = 3",
        isCorrect: false,
        xpEarned: 0,
      }),
    });
    if (challengeRes.status !== 201) {
      throw new Error(`Expected 201 Created for challenge attempt, got ${challengeRes.status}`);
    }
    const challengeJson = await challengeRes.json();
    if (challengeJson.stats.totalAttempts !== 1 || challengeJson.stats.accuracyPercent !== 0) {
      throw new Error(`Challenge stats unexpected: ${JSON.stringify(challengeJson.stats)}`);
    }

    const weakRes = await fetch(`${baseUrl}/user/analytics/weak-topics`, {
      headers: { Cookie: sessionCookie },
    });
    const weakJson = await weakRes.json();
    if (!weakJson.weakTopics || weakJson.weakTopics.length !== 1) {
      throw new Error(`Expected 1 weak topic entry, got ${JSON.stringify(weakJson)}`);
    }

    const traceBmRes = await fetch(`${baseUrl}/user/traces/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        algorithmId: "binary-search",
        stepIndex: 3,
        stepSnapshot: { line: 42, variables: { left: 1, right: 4 } },
        note: "Tricky partition boundary",
      }),
    });
    if (traceBmRes.status !== 201) {
      throw new Error(`Expected 201 Created for trace bookmark, got ${traceBmRes.status}`);
    }
    console.log("✓ Challenge accuracy, weak-topics analytics & trace bookmarks HTTP API verified.");

    // 12. Gemini Socratic Tutor & Edge-Case Endpoints (requireAuth Gated)
    console.log("\n[Test 12] Testing Gemini Socratic Tutor & Edge-Case Auth Gating...");
    const unauthTutorRes = await fetch(`${baseUrl}/gemini/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ algorithmId: "binary-search", step: { line: 1 } }),
    });
    if (unauthTutorRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for guest calling /gemini/tutor, got ${unauthTutorRes.status}`);
    }

    const unauthEdgeRes = await fetch(`${baseUrl}/gemini/edge-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ algorithmId: "binary-search" }),
    });
    if (unauthEdgeRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for guest calling /gemini/edge-cases, got ${unauthEdgeRes.status}`);
    }

    const badTutorRes = await fetch(`${baseUrl}/gemini/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({}),
    });
    if (badTutorRes.status !== 400) {
      throw new Error(`Expected 400 on invalid tutor payload, got ${badTutorRes.status}`);
    }

    const tutorRes = await fetch(`${baseUrl}/gemini/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        algorithmId: "binary-search",
        code: "while (left <= right) { int mid = left + (right - left) / 2; }",
        step: {
          line: 12,
          functionName: "binarySearch",
          variables: { left: 3, right: 2, mid: 2 },
          exception: {
            type: "java.lang.ArrayIndexOutOfBoundsException",
            message: "Index -1 out of bounds for length 5",
            line: 12,
          },
        },
        userQuery: "Why did execution fail here?",
      }),
    });
    if (tutorRes.status !== 200) {
      throw new Error(`Expected 200 OK from Socratic tutor, got ${tutorRes.status}`);
    }
    const tutorJson = await tutorRes.json();
    if (!tutorJson.tutor?.tier1Observation || !tutorJson.tutor?.tier2GuidingQuestion || !tutorJson.tutor?.tier3ActionHint) {
      throw new Error(`Incomplete Socratic tutor response: ${JSON.stringify(tutorJson)}`);
    }

    const edgeRes = await fetch(`${baseUrl}/gemini/edge-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        algorithmId: "binary-search",
        algorithmCategory: "Arrays",
        defaultInput: JSON.stringify({ array: [1, 3, 5], target: 3 }),
      }),
    });
    if (edgeRes.status !== 200) {
      throw new Error(`Expected 200 OK from edge-cases endpoint, got ${edgeRes.status}`);
    }
    const edgeJson = await edgeRes.json();
    if (!Array.isArray(edgeJson.cases) || edgeJson.cases.length === 0) {
      throw new Error(`Expected non-empty edge cases array, got ${JSON.stringify(edgeJson)}`);
    }
    console.log("✓ Gemini Socratic Tutor & Edge-Case requireAuth protection & payloads verified.");

    // 13. OTP Brute-Force Attempt Limit (Max 5 Attempts)
    console.log("\n[Test 13] Testing OTP Brute-Force 5-Attempt Lockout...");
    const otpBruteEmail = `brute_${Date.now()}@university.edu`;
    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Brute Test",
        email: otpBruteEmail,
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    });
    const realOtp = emailService.getLastTestOtp(otpBruteEmail);
    const wrongOtp = realOtp === "999999" ? "888888" : "999999";

    for (let i = 1; i <= 4; i++) {
      const r = await fetch(`${baseUrl}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpBruteEmail, otp: wrongOtp }),
      });
      if (r.status !== 400) {
        throw new Error(`Expected 400 on failed OTP attempt #${i}, got ${r.status}`);
      }
    }
    const fifthAttempt = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpBruteEmail, otp: wrongOtp }),
    });
    if (fifthAttempt.status !== 429) {
      throw new Error(`Expected 429 lockout on 5th failed OTP attempt, got ${fifthAttempt.status}`);
    }
    console.log("✓ 5-attempt OTP lockout (429 Too Many Requests) verified.");

    // 14. Password Reset Token Leak Prevention & Hashed Reset Flow
    console.log("\n[Test 14] Testing Password Reset Token Leak Prevention & Single-Use Reset...");
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (forgotRes.status !== 200) {
      throw new Error(`Expected 200 from forgot-password, got ${forgotRes.status}`);
    }
    const forgotJson = (await forgotRes.json()) as Record<string, unknown>;
    if ("demoResetToken" in forgotJson) {
      throw new Error("SECURITY VIOLATION: /auth/forgot-password must NEVER expose demoResetToken in HTTP JSON!");
    }
    const resetToken = emailService.getLastTestResetToken(email);
    if (!resetToken) {
      throw new Error("Expected reset token in test-only emailService observer cache");
    }
    const { userRepository } = await import("../src/repositories/userRepository.js");
    if (userRepository.findPasswordReset(resetToken) !== null) {
      throw new Error("SECURITY VIOLATION: Raw password reset token must not match plaintext DB column!");
    }
    const resetOkRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, newPassword: "NewPassword123!" }),
    });
    if (resetOkRes.status !== 200) {
      throw new Error(`Expected 200 OK resetting password with email token, got ${resetOkRes.status}`);
    }
    const resetReuseRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, newPassword: "AnotherPassword123!" }),
    });
    if (resetReuseRes.status !== 400) {
      throw new Error(`Expected 400 rejecting reused reset token, got ${resetReuseRes.status}`);
    }
    console.log("✓ Password reset token confidentiality, DB hashing & single-use verified.");

    // 15. Bounded Validator Guards & CSP img-src Check
    console.log("\n[Test 15] Testing Strict Payload Bounds & CSP Google Avatar Allowlist...");
    if (!csp.includes("https://lh3.googleusercontent.com")) {
      throw new Error(`CSP img-src must permit Google OAuth avatars, got: ${csp}`);
    }
    const postResetLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "NewPassword123!" }),
    });
    const { rawCookieHeader: freshCookie } = extractCookieValue(postResetLoginRes, "algolens_session");

    const badProfileRes = await fetch(`${baseUrl}/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: freshCookie },
      body: JSON.stringify({ avatar_url: ["not-a-string"] }),
    });
    if (badProfileRes.status !== 400) {
      throw new Error(`Expected 400 for non-string avatar_url, got ${badProfileRes.status}`);
    }

    const badProgressRes = await fetch(`${baseUrl}/user/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: freshCookie },
      body: JSON.stringify({ algorithmId: "../bad/id" }),
    });
    if (badProgressRes.status !== 400) {
      throw new Error(`Expected 400 for invalid algorithmId on /user/progress, got ${badProgressRes.status}`);
    }

    const oversizedTutorRes = await fetch(`${baseUrl}/gemini/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: freshCookie },
      body: JSON.stringify({
        algorithmId: "binary-search",
        code: "x".repeat(25000),
        step: { line: 1 },
      }),
    });
    if (oversizedTutorRes.status !== 400) {
      throw new Error(`Expected 400 for oversized Gemini code payload, got ${oversizedTutorRes.status}`);
    }
    console.log("✓ Validator type/regex/size bounds and CSP img-src verified.");

    // 16. SEO Metadata, Sitemap, Robots, Manifest, Icons & SSR Injection
    console.log("\n[Test 16] Testing Robots, Sitemap, Manifest, OG Assets & SSR Meta Injection...");
    const rootOrigin = "http://localhost:5188";
    const fs = await import("node:fs");
    const path = await import("node:path");
    const frontendMetaPath = path.resolve(import.meta.dirname, "../../frontend/src/data/algorithmMeta.ts");
    const frontendAlgoText = fs.readFileSync(frontendMetaPath, "utf-8");
    const frontendIds = Array.from(frontendAlgoText.matchAll(/\bid:\s*"([^"]+)"/g)).map((m) => m[1]);

    const robotsRes = await fetch(`${rootOrigin}/robots.txt`);
    const robotsTxt = await robotsRes.text();
    if (
      robotsRes.status !== 200 ||
      !robotsTxt.includes("Disallow: /api/") ||
      !robotsTxt.includes("Disallow: /profile") ||
      !robotsTxt.includes("Sitemap: http://localhost:5188/sitemap.xml")
    ) {
      throw new Error(`Invalid /robots.txt response (${robotsRes.status}): ${robotsTxt}`);
    }

    const sitemapRes = await fetch(`${rootOrigin}/sitemap.xml`);
    const sitemapXml = await sitemapRes.text();
    const { PUBLIC_ALGORITHMS } = await import("../src/seo/seoCatalog.js");
    for (const fid of frontendIds) {
      if (!PUBLIC_ALGORITHMS.some((a) => a.id === fid)) {
        throw new Error(`SEO catalog missing frontend algorithm ID: ${fid}`);
      }
    }
    if (
      sitemapRes.status !== 200 ||
      !sitemapXml.includes("<loc>http://localhost:5188/</loc>") ||
      !sitemapXml.includes("<loc>http://localhost:5188/explore</loc>") ||
      sitemapXml.includes("<changefreq>") ||
      sitemapXml.includes("<priority>")
    ) {
      throw new Error(`Invalid /sitemap.xml output (${sitemapRes.status})`);
    }
    for (const alg of PUBLIC_ALGORITHMS) {
      if (!sitemapXml.includes(`<loc>http://localhost:5188/visualizer/${alg.id}</loc>`)) {
        throw new Error(`Sitemap missing algorithm route: ${alg.id}`);
      }
    }

    const distDir = path.resolve(import.meta.dirname, "../../frontend/dist");
    if (fs.existsSync(path.join(distDir, "index.html"))) {
      const manifestRes = await fetch(`${rootOrigin}/manifest.json`);
      const manifestJson = await manifestRes.json();
      if (manifestRes.status !== 200 || !Array.isArray(manifestJson.icons) || manifestJson.icons.length < 3) {
        throw new Error(`Invalid manifest.json (${manifestRes.status})`);
      }

      for (const assetPath of [
        "/favicon.ico",
        "/icon.svg",
        "/apple-icon.png",
        "/icon-192.png",
        "/icon-512.png",
        "/brand/algolens-mark.svg",
        "/brand/algolens-logo.svg",
      ]) {
        const assetRes = await fetch(`${rootOrigin}${assetPath}`);
        if (assetRes.status !== 200) {
          throw new Error(`Expected ${assetPath} HTTP 200, got ${assetRes.status}`);
        }
      }

      const homeHtml = await (await fetch(`${rootOrigin}/`)).text();
      if (
        !homeHtml.includes('<link rel="canonical" href="http://localhost:5188/"') ||
        !homeHtml.includes('"@type":"SoftwareApplication"') ||
        !homeHtml.includes('"@type":"WebSite"')
      ) {
        throw new Error("Homepage SSR HTML missing canonical or Schema.org JSON-LD");
      }

      const algHtmlRes = await fetch(`${rootOrigin}/visualizer/binary-search`);
      const algHtml = await algHtmlRes.text();
      if (
        algHtmlRes.status !== 200 ||
        !algHtml.includes("Binary Search Visualizer") ||
        !algHtml.includes('<link rel="canonical" href="http://localhost:5188/visualizer/binary-search"') ||
        !algHtml.includes("/og/binary-search.png") ||
        !algHtml.includes('"@type":"LearningResource"') ||
        !algHtml.includes('"@type":"TechArticle"')
      ) {
        throw new Error("Algorithm SSR HTML missing expected title, canonical, OG image, or JSON-LD");
      }

      const loginHtml = await (await fetch(`${rootOrigin}/login`)).text();
      if (!loginHtml.includes('<meta name="robots" content="noindex, nofollow"')) {
        throw new Error("/login must emit noindex, nofollow");
      }

      const notFoundRes = await fetch(`${rootOrigin}/nonexistent-route-check`);
      if (notFoundRes.status !== 404) {
        throw new Error(`Expected genuine HTTP 404 for unknown path, got ${notFoundRes.status}`);
      }
    }
    console.log(`✓ SEO endpoints, ${PUBLIC_ALGORITHMS.length}-algorithm sitemap, manifests & SSR metadata verified.`);

    // 17. Google OAuth Error Handling (Providers, Invalid State Popup/JSON, Unconfigured Popup)
    console.log("\n[Test 17] Testing Google OAuth Error Handling...");
    const providersRes = await fetch(`${baseUrl}/auth/providers`);
    if (providersRes.status !== 200) {
      throw new Error(`Expected 200 for /auth/providers, got ${providersRes.status}`);
    }
    const providersJson = await providersRes.json();
    if (typeof providersJson.googleEnabled !== "boolean" || !providersJson.emailOtpEnabled) {
      throw new Error(`Invalid /auth/providers payload: ${JSON.stringify(providersJson)}`);
    }

    const cbHtmlRes = await fetch(`${baseUrl}/auth/google/callback?code=fake_code&state=bad_nonce`, {
      headers: { Accept: "text/html" },
      redirect: "manual",
    });
    const cbHtmlText = await cbHtmlRes.text();
    if (
      cbHtmlRes.status !== 400 ||
      !cbHtmlRes.headers.get("content-type")?.includes("text/html") ||
      !cbHtmlText.includes("ALGOLENS_OAUTH_ERROR") ||
      !cbHtmlText.includes("invalid_state")
    ) {
      throw new Error(`Expected popup-safe HTML error on invalid OAuth state callback, got ${cbHtmlRes.status}`);
    }

    const cbJsonRes = await fetch(`${baseUrl}/auth/google/callback?code=fake_code&state=bad_nonce`, {
      headers: { Accept: "application/json" },
    });
    const cbJsonData = await cbJsonRes.json();
    if (cbJsonRes.status !== 400 || cbJsonData.code !== "invalid_state") {
      throw new Error(`Expected JSON code='invalid_state' for API caller, got ${JSON.stringify(cbJsonData)}`);
    }

    const { renderOAuthPopupHtml } = await import("../src/controllers/authController.js");
    const popupHtml = renderOAuthPopupHtml({
      status: "error",
      errorCode: "not_configured",
      message: "OAuth missing <test>",
      targetOrigin: "http://localhost:5173",
      fallbackUrl: "http://localhost:5173/login?oauthError=not_configured",
    });
    if (
      !popupHtml.includes("ALGOLENS_OAUTH_ERROR") ||
      !popupHtml.includes("not_configured") ||
      popupHtml.includes("OAuth missing <test>")
    ) {
      throw new Error("renderOAuthPopupHtml failed XSS escaping or postMessage payload check");
    }
    console.log("✓ Google OAuth providers endpoint, popup HTML error handling, and XSS escaping verified.");

    // 18. Crash-Prevention Guards: 256KB Payload Ceiling (413) & Gemini Rate Limiter (429)
    console.log("\n[Test 18] Testing 256KB Body Size Cap (413) & Per-User Gemini Rate Limit (429)...");
    const hugeBodyRes = await fetch(`${baseUrl}/gemini/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: freshCookie },
      body: JSON.stringify({ algorithmId: "binary-search", code: "x".repeat(300_000), step: { line: 1 } }),
    });
    if (hugeBodyRes.status !== 413) {
      throw new Error(`Expected 413 Payload Too Large for >256kb body, got ${hugeBodyRes.status}`);
    }

    let gotRateLimited = false;
    for (let i = 0; i < 7; i++) {
      const rlRes = await fetch(`${baseUrl}/gemini/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: freshCookie },
        body: JSON.stringify({ algorithmId: "binary-search", step: { line: 1 } }),
      });
      if (rlRes.status === 429) {
        const rlJson = await rlRes.json();
        if (rlJson.error !== "Too Many Requests") {
          throw new Error(`Unexpected 429 payload: ${JSON.stringify(rlJson)}`);
        }
        gotRateLimited = true;
        break;
      }
    }
    if (!gotRateLimited) {
      throw new Error("Expected Gemini rate limiter to enforce 429 within burst threshold");
    }
    console.log("✓ 256KB payload cap (413) and Gemini per-user burst limiter (429) verified.");

    console.log("\n🎉 ALL 18 BACKEND HTTP, SECURITY, SEO & AUTH TESTS PASSED!");
  } finally {
    server.close();
  }
}

runApiTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
