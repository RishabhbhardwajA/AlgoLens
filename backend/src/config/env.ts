import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root workspace .env first, then backend/.env fallback (without overriding existing OS env vars)
const envCandidates = [
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
];
const seenEnvPaths = new Set<string>();
for (const envPath of envCandidates) {
  const normalized = path.resolve(envPath);
  if (seenEnvPaths.has(normalized)) continue;
  seenEnvPaths.add(normalized);
  if (fs.existsSync(normalized)) {
    dotenv.config({ path: normalized, quiet: true });
  }
}

const INSECURE_EXAMPLE_SECRETS = new Set([
  "algolens-super-secret-jwt-key-2026",
  "algolens_production_super_secret_jwt_key_replace_me_in_prod_2026",
  "secret",
  "jwt_secret",
  "change_me",
  "your_jwt_secret_here",
  "12345678",
  "password",
]);

export interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  isProduction: boolean;
  JWT_SECRET: string;
  CLIENT_URL: string;
  PUBLIC_APP_URL: string;
  DATABASE_PATH?: string;
  JUDGE0_API_URL?: string;
  JUDGE0_API_KEY?: string;
  JUDGE0_API_HOST?: string;
  USE_MOCK_EXECUTION: boolean;
  ENABLE_JAVA_TRACING: boolean;
  JAVA_TRACE_WORKER_URL?: string;
  EXECUTION_ROLE: "api" | "worker";
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  GEMINI_ENABLED: boolean;
  GEMINI_USER_DAILY_CAP: number;
  GEMINI_GLOBAL_DAILY_CAP: number;
  GEMINI_MAX_OUTPUT_TOKENS: number;
  GEMINI_CACHE_TTL_MS: number;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI: string;
  EMAIL_FROM: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
}

/**
 * Validates configuration and enforces that production mode rejects missing,
 * weak (< 32 chars), or example placeholder JWT secrets, and prohibits mock execution.
 */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const port = parseInt(env.PORT || "5000", 10);
  const clientUrl = env.CLIENT_URL || "http://localhost:5173";
  const publicAppUrl = (env.PUBLIC_APP_URL?.trim() || clientUrl).replace(/\/+$/, "");
  const databasePath = env.DATABASE_PATH;

  const rawSecret = env.JWT_SECRET?.trim();
  const executionRole: "api" | "worker" = env.EXECUTION_ROLE === "worker" ? "worker" : "api";

  if (isProduction) {
    // Only API role requires JWT secrets; worker runs with zero application secrets
    if (executionRole !== "worker") {
      if (!rawSecret) {
        throw new Error(
          "FATAL SECURITY CONFIG ERROR: JWT_SECRET environment variable is missing in production mode. " +
            "Refusing to boot server with insecure state. Please define a 32+ character random secret."
        );
      }

      if (INSECURE_EXAMPLE_SECRETS.has(rawSecret)) {
        throw new Error(
          "FATAL SECURITY CONFIG ERROR: The configured JWT_SECRET matches a documented public example string. " +
            "Refusing to start in production with an exposed placeholder key."
        );
      }

      if (rawSecret.length < 32) {
        throw new Error(
          `FATAL SECURITY CONFIG ERROR: In production mode, JWT_SECRET must be at least 32 characters long ` +
            `(currently ${rawSecret.length} characters).`
        );
      }
    }

    if (env.USE_MOCK_EXECUTION === "true") {
      throw new Error(
        "FATAL SECURITY CONFIG ERROR: USE_MOCK_EXECUTION is strictly prohibited in production mode. " +
          "Production must never return simulated mock results as though real code executed."
      );
    }
  }

  // Development/Test fallback
  const jwtSecret =
    rawSecret || "algolens_dev_secret_only_for_local_development_do_not_use_in_prod";

  if (!rawSecret && nodeEnv !== "test") {
    console.warn(
      "⚠️  [AlgoLens Config Warning] No JWT_SECRET provided in environment. " +
        "Using development fallback key. This fallback is strictly forbidden in production."
    );
  }

  const judge0Url = env.JUDGE0_API_URL?.trim();
  const judge0Key = env.JUDGE0_API_KEY?.trim();
  const judge0Host = env.JUDGE0_API_HOST?.trim();

  // Mock execution may only be enabled in dev/test if explicitly requested
  const useMockExecution = !isProduction && (env.USE_MOCK_EXECUTION === "true" || nodeEnv === "test");

  const enableJavaTracing = env.ENABLE_JAVA_TRACING === "true";
  const javaTraceWorkerUrl = env.JAVA_TRACE_WORKER_URL?.trim();
  const geminiApiKey = executionRole !== "worker" ? env.GEMINI_API_KEY?.trim() : undefined;
  const geminiModel = env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const geminiEnabled = env.GEMINI_ENABLED !== "false";

  const parsedUserCap = parseInt(env.GEMINI_USER_DAILY_CAP || "10", 10);
  const geminiUserDailyCap =
    Number.isFinite(parsedUserCap) && parsedUserCap >= 0 ? Math.min(parsedUserCap, 100) : 10;

  const parsedGlobalCap = parseInt(env.GEMINI_GLOBAL_DAILY_CAP || "80", 10);
  const geminiGlobalDailyCap =
    Number.isFinite(parsedGlobalCap) && parsedGlobalCap >= 0 ? Math.min(parsedGlobalCap, 1000) : 80;

  const parsedMaxTokens = parseInt(env.GEMINI_MAX_OUTPUT_TOKENS || "420", 10);
  const geminiMaxOutputTokens =
    Number.isFinite(parsedMaxTokens) && parsedMaxTokens >= 150 ? Math.min(parsedMaxTokens, 800) : 420;

  const parsedCacheTtl = parseInt(env.GEMINI_CACHE_TTL_MS || "900000", 10);
  const geminiCacheTtlMs =
    Number.isFinite(parsedCacheTtl) && parsedCacheTtl >= 0 ? parsedCacheTtl : 900_000;

  const googleClientId = executionRole !== "worker" ? env.GOOGLE_CLIENT_ID?.trim() : undefined;
  const googleClientSecret = executionRole !== "worker" ? env.GOOGLE_CLIENT_SECRET?.trim() : undefined;
  const googleRedirectUri =
    env.GOOGLE_REDIRECT_URI?.trim() || `http://localhost:${isNaN(port) ? 5000 : port}/api/auth/google/callback`;

  const emailFrom = env.EMAIL_FROM?.trim() || "AlgoLens <noreply@algolens.dev>";
  const smtpHost = executionRole !== "worker" ? env.SMTP_HOST?.trim() : undefined;
  const smtpPort = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587;
  const smtpUser = executionRole !== "worker" ? env.SMTP_USER?.trim() : undefined;
  const smtpPass = executionRole !== "worker" ? env.SMTP_PASS?.trim() : undefined;

  return {
    PORT: isNaN(port) ? 5000 : port,
    NODE_ENV: nodeEnv,
    isProduction,
    JWT_SECRET: jwtSecret,
    CLIENT_URL: clientUrl,
    PUBLIC_APP_URL: publicAppUrl,
    DATABASE_PATH: databasePath,
    JUDGE0_API_URL: judge0Url,
    JUDGE0_API_KEY: judge0Key,
    JUDGE0_API_HOST: judge0Host,
    USE_MOCK_EXECUTION: useMockExecution,
    ENABLE_JAVA_TRACING: enableJavaTracing,
    JAVA_TRACE_WORKER_URL: javaTraceWorkerUrl,
    EXECUTION_ROLE: executionRole,
    GEMINI_API_KEY: geminiApiKey,
    GEMINI_MODEL: geminiModel,
    GEMINI_ENABLED: geminiEnabled,
    GEMINI_USER_DAILY_CAP: geminiUserDailyCap,
    GEMINI_GLOBAL_DAILY_CAP: geminiGlobalDailyCap,
    GEMINI_MAX_OUTPUT_TOKENS: geminiMaxOutputTokens,
    GEMINI_CACHE_TTL_MS: geminiCacheTtlMs,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_REDIRECT_URI: googleRedirectUri,
    EMAIL_FROM: emailFrom,
    SMTP_HOST: smtpHost,
    SMTP_PORT: isNaN(smtpPort) ? 587 : smtpPort,
    SMTP_USER: smtpUser,
    SMTP_PASS: smtpPass,
  };
}

export const config = validateEnvironment();
export const JWT_SECRET = config.JWT_SECRET;
