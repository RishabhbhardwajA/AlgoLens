import dotenv from "dotenv";

dotenv.config();

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
  DATABASE_PATH?: string;
  JUDGE0_API_URL?: string;
  JUDGE0_API_KEY?: string;
  JUDGE0_API_HOST?: string;
  USE_MOCK_EXECUTION: boolean;
  ENABLE_JAVA_TRACING: boolean;
  JAVA_TRACE_WORKER_URL?: string;
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
  const databasePath = env.DATABASE_PATH;

  const rawSecret = env.JWT_SECRET?.trim();

  if (isProduction) {
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

  return {
    PORT: isNaN(port) ? 5000 : port,
    NODE_ENV: nodeEnv,
    isProduction,
    JWT_SECRET: jwtSecret,
    CLIENT_URL: clientUrl,
    DATABASE_PATH: databasePath,
    JUDGE0_API_URL: judge0Url,
    JUDGE0_API_KEY: judge0Key,
    JUDGE0_API_HOST: judge0Host,
    USE_MOCK_EXECUTION: useMockExecution,
    ENABLE_JAVA_TRACING: enableJavaTracing,
    JAVA_TRACE_WORKER_URL: javaTraceWorkerUrl,
  };
}

export const config = validateEnvironment();
export const JWT_SECRET = config.JWT_SECRET;
