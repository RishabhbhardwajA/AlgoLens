import { useEffect } from "react";

export interface DocumentMetaOptions {
  title: string;
  description: string;
  keywords?: string[];
  canonicalPath?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string;
  jsonLd?: Record<string, unknown>[];
}

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function replaceJsonLd(schemas: Record<string, unknown>[]): void {
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((node) => node.remove());

  for (const schema of schemas) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-algolens-seo", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}

export function useDocumentMeta({
  title,
  description,
  keywords,
  canonicalPath,
  noIndex = false,
  ogType = "website",
  ogImage = "/og-image.png",
  jsonLd = [],
}: DocumentMetaOptions): void {
  const keywordsKey = keywords?.join(", ") ?? "";
  const jsonLdKey = JSON.stringify(jsonLd);

  useEffect(() => {
    const origin = window.location.origin;
    const cleanPath =
      canonicalPath ?? (window.location.pathname.replace(/\/+$/, "") || "/");
    const canonicalUrl = `${origin}${cleanPath}`;
    const resolvedImage = ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`;
    const robotsDirective = noIndex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    document.title = title;
    upsertMeta("name", "description", description);
    if (keywordsKey) {
      upsertMeta("name", "keywords", keywordsKey);
    } else {
      document.head.querySelector('meta[name="keywords"]')?.remove();
    }
    upsertMeta("name", "robots", robotsDirective);
    upsertCanonical(canonicalUrl);

    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:site_name", "AlgoLens");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", resolvedImage);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", resolvedImage);

    replaceJsonLd(jsonLd);
  }, [title, description, keywordsKey, canonicalPath, noIndex, ogType, ogImage, jsonLdKey]);
}
