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
}

/**
 * Validates configuration and enforces that production mode rejects missing,
 * weak (< 32 chars), or example placeholder JWT secrets.
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

  return {
    PORT: isNaN(port) ? 5000 : port,
    NODE_ENV: nodeEnv,
    isProduction,
    JWT_SECRET: jwtSecret,
    CLIENT_URL: clientUrl,
    DATABASE_PATH: databasePath,
  };
}

export const config = validateEnvironment();
export const JWT_SECRET = config.JWT_SECRET;
