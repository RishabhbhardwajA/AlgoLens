import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import passport from "./config/passport.js";
import routes from "./routes/index.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { securityHeaders, sanitizeBody } from "./middleware/security.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

export const app = express();

// Security and Logging
app.use(securityHeaders);
app.use(requestLogger);

// CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Body Parsing & Sanitization
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(sanitizeBody);

// Passport Auth
app.use(passport.initialize());

// Rate Limiting
app.use("/api", apiLimiter);

// Mount API routes
app.use("/api", routes);

// Error Handling
app.use(errorHandler);

// Production Static Asset & SPA Fallback Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
