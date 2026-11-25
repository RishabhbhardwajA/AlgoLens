import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import passport from "./config/passport.js";
import routes from "./routes/index.js";
import seoRoutes from "./seo/seoRoutes.js";
import { resolvePageSeo, injectSeoIntoHtml } from "./seo/htmlInjector.js";
import { config } from "./config/env.js";
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
const allowedOrigins = Array.from(
  new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    config.CLIENT_URL,
  ])
);

app.use(
  cors({
    origin: allowedOrigins,
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

// Mount API & Crawl Metadata Routes
app.use("/api", routes);
app.use("/", seoRoutes);

// Error Handling
app.use(errorHandler);

// Production Static Asset & SEO-Injected SPA Fallback Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

if (fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      index: false,
      maxAge: "1d",
      setHeaders(res, filePath) {
        if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    })
  );

  const templatePath = path.join(frontendDist, "index.html");
  let cachedIndexHtml: string | null = null;

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }

    if (!cachedIndexHtml && fs.existsSync(templatePath)) {
      cachedIndexHtml = fs.readFileSync(templatePath, "utf-8");
    }

    if (!cachedIndexHtml) {
      return next();
    }

    const seo = resolvePageSeo(req);
    const html = injectSeoIntoHtml(cachedIndexHtml, seo);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.status(seo.statusCode).send(html);
  });
}

export default app;
