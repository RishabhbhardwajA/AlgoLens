import app from "./app.js";
import { db, cleanupExpiredAuthRecords } from "./database/database.js";
import { validateEnvironment } from "./config/env.js";

// Validate environment configuration (rejects missing/weak/example JWT_SECRET in production)
const config = validateEnvironment();
const PORT = config.PORT;

// Clean expired transient DB rows on boot and periodically without keeping event loop alive
cleanupExpiredAuthRecords();
const dbCleanupTimer = setInterval(cleanupExpiredAuthRecords, 6 * 60 * 60 * 1000);
dbCleanupTimer.unref();

const server = app.listen(PORT, () => {
  console.log(`🚀 AlgoLens Backend Server running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication & User API active at http://localhost:${PORT}/api/auth`);
});

// Slowloris & hung-connection protection
server.keepAliveTimeout = 5000;
server.headersTimeout = 15000;
server.requestTimeout = 30000;

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Exiting cleanly.`);
  } else {
    console.error("❌ HTTP server fatal error:", err);
  }
  process.exit(1);
});

let shuttingDown = false;

// Graceful shutdown handling for container runtimes (Docker, Kubernetes)
function gracefulShutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(dbCleanupTimer);
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
    process.exit(exitCode);
  });

  // Force shutdown if requests do not terminate within 10 seconds
  setTimeout(() => {
    console.error("⚠️ Graceful shutdown timed out (10s limit). Forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("unhandledRejection", (reason) => {
  console.error("[AlgoLens UnhandledRejection]:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[AlgoLens UncaughtException]:", err);
  gracefulShutdown("uncaughtException", 1);
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM", 0));
process.on("SIGINT", () => gracefulShutdown("SIGINT", 0));
