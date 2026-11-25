import type { Request } from "express";
import {
  PUBLIC_ALGORITHMS,
  PRIVATE_NOINDEX_PATHS,
  STATIC_PUBLIC_ROUTES,
  findAlgorithmSeo,
} from "./seoCatalog.js";
import { resolveSiteOrigin } from "./seoRoutes.js";

export interface ResolvedPageSeo {
  statusCode: number;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
  ogType: "website" | "article";
  ogImageUrl: string;
  jsonLd: Record<string, unknown>[];
  crawlerSummaryHtml: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function normalizePathname(rawPath: string): string {
  if (!rawPath || rawPath === "/") return "/";
  return rawPath.replace(/\/+$/, "") || "/";
}

export function resolvePageSeo(req: Request): ResolvedPageSeo {
  const origin = resolveSiteOrigin(req);
  const rawPathname = normalizePathname(req.path);

  const indexDirectives =
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  // 1. Canonicalize legacy /explorer -> /explore
  const effectivePath = rawPathname === "/explorer" ? "/explore" : rawPathname;

  // 2. Private / utility pages (strictly noindex)
  if (PRIVATE_NOINDEX_PATHS.has(effectivePath)) {
    const labelMap: Record<string, string> = {
      "/login": "Sign In",
      "/register": "Create Account",
      "/forgot-password": "Reset Password",
      "/profile": "Profile & Progress",
    };
    const pageTitle = `${labelMap[effectivePath] || "Account"} | AlgoLens`;
    return {
      statusCode: 200,
      title: pageTitle,
      description: "AlgoLens account and authentication utilities.",
      keywords: "AlgoLens, account, DSA learning",
      canonicalUrl: `${origin}${effectivePath}`,
      robots: "noindex, nofollow",
      ogType: "website",
      ogImageUrl: `${origin}/og-image.png`,
      jsonLd: [],
      crawlerSummaryHtml: `<main><h1>${escapeHtml(labelMap[effectivePath] || "Account")}</h1></main>`,
    };
  }

  // 3. Algorithm Visualizer (/visualizer or /visualizer/:id)
  if (effectivePath === "/visualizer" || effectivePath.startsWith("/visualizer/")) {
    const slugFromPath = effectivePath.startsWith("/visualizer/")
      ? effectivePath.slice("/visualizer/".length).split("/")[0]
      : "";
    const queryAlgo = typeof req.query.algo === "string" ? req.query.algo.trim() : "";
    const resolvedId = slugFromPath || queryAlgo || "binary-search";
    const alg = findAlgorithmSeo(resolvedId);

    if (!alg) {
      return {
        statusCode: 404,
        title: "Algorithm Not Found | AlgoLens",
        description: "The requested algorithm visualizer could not be found.",
        keywords: "AlgoLens, DSA visualizer",
        canonicalUrl: `${origin}/explore`,
        robots: "noindex, nofollow",
        ogType: "website",
        ogImageUrl: `${origin}/og-image.png`,
        jsonLd: [],
        crawlerSummaryHtml: `<main><h1>Algorithm Not Found</h1><p>Explore all algorithms at <a href="/explore">AlgoLens Explorer</a>.</p></main>`,
      };
    }

    const canonicalUrl = `${origin}/visualizer/${alg.id}`;
    const title = `${alg.name} Visualizer (${alg.timeComplexity}) | AlgoLens`;
    const description = `${alg.description} Step through ${alg.name} interactively with ${alg.timeComplexity} time and ${alg.spaceComplexity} space complexity tracking, call stack frames, and code sync.`;
    const ogImageUrl = `${origin}/og/${alg.id}.png`;

    const jsonLd: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: `${alg.name} Interactive Visualizer`,
        headline: title,
        description,
        url: canonicalUrl,
        image: ogImageUrl,
        educationalLevel: alg.difficulty,
        learningResourceType: "Interactive Simulation",
        keywords: [alg.name, alg.category, ...alg.tags, "DSA Visualizer"].join(", "),
        about: {
          "@type": "Thing",
          name: `${alg.name} (${alg.category})`,
        },
        provider: {
          "@type": "Organization",
          name: "AlgoLens",
          url: origin,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: `${alg.name} — Step-by-Step Execution & Complexity`,
        description,
        url: canonicalUrl,
        dateModified: alg.lastModified,
        proficiencyLevel: alg.difficulty,
        author: {
          "@type": "Organization",
          name: "AlgoLens",
        },
      },
    ];

    const crawlerSummaryHtml = `
      <main data-seo-fallback="true" style="max-width:760px;margin:48px auto;padding:24px;font-family:Inter,sans-serif;">
        <h1>${escapeHtml(alg.name)}</h1>
        <p><strong>Category:</strong> ${escapeHtml(alg.category)} | <strong>Difficulty:</strong> ${escapeHtml(alg.difficulty)}</p>
        <p>${escapeHtml(alg.description)}</p>
        <p><strong>Time Complexity:</strong> ${escapeHtml(alg.timeComplexity)} | <strong>Space Complexity:</strong> ${escapeHtml(alg.spaceComplexity)}</p>
        <nav aria-label="Related links"><a href="/">Home</a> · <a href="/explore">All Algorithms</a> · <a href="/playground">Code Sandbox</a></nav>
      </main>
    `.trim();

    return {
      statusCode: 200,
      title,
      description,
      keywords: [alg.name, alg.category, ...alg.tags, "DSA visualizer", "AlgoLens"].join(", "),
      canonicalUrl,
      robots: indexDirectives,
      ogType: "article",
      ogImageUrl,
      jsonLd,
      crawlerSummaryHtml,
    };
  }

  // 4. Static Public Routes (/, /explore, /playground, /race, /builder)
  const staticRoute = STATIC_PUBLIC_ROUTES.find((r) => r.path === effectivePath);
  if (staticRoute) {
    const canonicalUrl = `${origin}${staticRoute.path}`;
    const ogImageUrl = `${origin}${staticRoute.ogImage}`;
    const jsonLd: Record<string, unknown>[] = [];

    if (staticRoute.path === "/") {
      jsonLd.push(
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AlgoLens",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          url: origin,
          image: ogImageUrl,
          description: staticRoute.description,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "23 interactive DSA visualizers",
            "Real-time OpenJDK JDI Java debugger trace visualization",
            "Algorithm Big-O side-by-side race arena",
            "Interactive BFS, DFS, and Dijkstra graph builder",
            "Socratic AI debugging tutor",
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "AlgoLens",
          url: origin,
          potentialAction: {
            "@type": "SearchAction",
            target: `${origin}/explore?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      );
    } else if (staticRoute.path === "/explore") {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "AlgoLens Algorithm Explorer",
        description: staticRoute.description,
        url: canonicalUrl,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: PUBLIC_ALGORITHMS.length,
          itemListElement: PUBLIC_ALGORITHMS.map((alg, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: alg.name,
            url: `${origin}/visualizer/${alg.id}`,
          })),
        },
      });
    } else {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: staticRoute.title.replace(" | AlgoLens", ""),
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: canonicalUrl,
        description: staticRoute.description,
      });
    }

    const linksHtml = PUBLIC_ALGORITHMS.slice(0, 8)
      .map((a) => `<a href="/visualizer/${escapeHtml(a.id)}">${escapeHtml(a.name)}</a>`)
      .join(" · ");

    const crawlerSummaryHtml = `
      <main data-seo-fallback="true" style="max-width:860px;margin:48px auto;padding:24px;font-family:Inter,sans-serif;">
        <h1>${escapeHtml(staticRoute.title.replace(" | AlgoLens", ""))}</h1>
        <p>${escapeHtml(staticRoute.description)}</p>
        <nav aria-label="Popular visualizers"><a href="/explore">Explore Algorithms</a> · ${linksHtml}</nav>
      </main>
    `.trim();

    return {
      statusCode: 200,
      title: staticRoute.title,
      description: staticRoute.description,
      keywords: staticRoute.keywords.join(", "),
      canonicalUrl,
      robots: indexDirectives,
      ogType: "website",
      ogImageUrl,
      jsonLd,
      crawlerSummaryHtml,
    };
  }

  // 5. Unknown route -> genuine HTTP 404 + noindex (no soft-404)
  return {
    statusCode: 404,
    title: "404 — Page Not Found | AlgoLens",
    description: "The page you are looking for does not exist on AlgoLens.",
    keywords: "AlgoLens",
    canonicalUrl: `${origin}/`,
    robots: "noindex, nofollow",
    ogType: "website",
    ogImageUrl: `${origin}/og-image.png`,
    jsonLd: [],
    crawlerSummaryHtml: `<main><h1>404 — Page Not Found</h1><p><a href="/">Return Home</a></p></main>`,
  };
}

export function injectSeoIntoHtml(templateHtml: string, seo: ResolvedPageSeo): string {
  const jsonLdBlock = seo.jsonLd
    .map(
      (schema) =>
        `<script type="application/ld+json">${serializeJsonLd(schema)}</script>`
    )
    .join("\n    ");

  const seoHeadTags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:type" content="${seo.ogType}" />`,
    `<meta property="og:site_name" content="AlgoLens" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.ogImageUrl)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.ogImageUrl)}" />`,
    jsonLdBlock,
  ]
    .filter(Boolean)
    .join("\n    ");

  // Strip static placeholder SEO tags between <!-- SEO:START --> and <!-- SEO:END --> if present
  let html = templateHtml.replace(
    /<!--\s*SEO:START\s*-->[\s\S]*?<!--\s*SEO:END\s*-->/,
    seoHeadTags
  );

  if (html === templateHtml) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace("</head>", `    ${seoHeadTags}\n  </head>`);
  }

  html = html.replace('<div id="root"></div>', `<div id="root">${seo.crawlerSummaryHtml}</div>`);
  return html;
}
