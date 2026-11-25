import { Router, type Request, type Response } from "express";
import { config } from "../config/env.js";
import { PUBLIC_ALGORITHMS, STATIC_PUBLIC_ROUTES } from "./seoCatalog.js";

const router = Router();

export function resolveSiteOrigin(req: Request): string {
  if (config.PUBLIC_APP_URL && !config.PUBLIC_APP_URL.includes("localhost:5173")) {
    return config.PUBLIC_APP_URL;
  }
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) {
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return config.PUBLIC_APP_URL;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/robots.txt", (req: Request, res: Response) => {
  const origin = resolveSiteOrigin(req);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /profile",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /forgot-password",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(body);
});

router.get("/sitemap.xml", (req: Request, res: Response) => {
  const origin = resolveSiteOrigin(req);

  const staticEntries = STATIC_PUBLIC_ROUTES.map((route) => ({
    loc: `${origin}${route.path}`,
    lastmod: route.lastModified,
  }));

  const algorithmEntries = PUBLIC_ALGORITHMS.map((alg) => ({
    loc: `${origin}/visualizer/${alg.id}`,
    lastmod: alg.lastModified,
  }));

  const urlsXml = [...staticEntries, ...algorithmEntries]
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(
          entry.lastmod
        )}</lastmod>\n  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
});

export default router;
