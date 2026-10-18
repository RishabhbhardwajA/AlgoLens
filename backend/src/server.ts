import app from "./app.js";
import { db } from "./database/database.js";
import { validateEnvironment } from "./config/env.js";

// Validate environment configuration (rejects missing/weak/example JWT_SECRET in production)
const config = validateEnvironment();
const PORT = config.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 AlgoLens Backend Server running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication & User API active at http://localhost:${PORT}/api/auth`);
});

// Graceful shutdown handling for container runtimes (Docker, Kubernetes)
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log("🔌 HTTP server closed.");

    try {
      // Flush WAL journal to main SQLite database and close handle
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      db.close();
      console.log("💾 SQLite database checkpointed and closed cleanly.");
    } catch (err) {
      console.error("Error closing SQLite database during shutdown:", err);
    }

    console.log("✅ Graceful shutdown completed.");
    process.exit(0);
  });

  // Force shutdown if requests do not terminate within 10 seconds
  setTimeout(() => {
    console.error("⚠️ Graceful shutdown timed out (10s limit). Forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
