import { ALGORITHM_META, type AlgorithmMeta } from "@/data/algorithmMeta";

export function buildHomeJsonLd(origin: string): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AlgoLens",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: origin,
      image: `${origin}/og-image.png`,
      description:
        "Interactive Data Structures and Algorithms visualizer with step-by-step playback, OpenJDK JDI debugger tracing, Big-O race comparisons, and Socratic AI tutoring.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
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
    },
  ];
}

export function buildExplorerJsonLd(origin: string): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "AlgoLens Algorithm Explorer",
      url: `${origin}/explore`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: ALGORITHM_META.length,
        itemListElement: ALGORITHM_META.map((alg, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: alg.name,
          url: `${origin}/visualizer/${alg.id}`,
        })),
      },
    },
  ];
}

export function buildAlgorithmJsonLd(origin: string, meta: AlgorithmMeta): Record<string, unknown>[] {
  const url = `${origin}/visualizer/${meta.id}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: `${meta.name} Interactive Visualizer`,
      headline: `${meta.name} Visualizer (${meta.timeComplexity}) | AlgoLens`,
      description: meta.description,
      url,
      image: `${origin}/og/${meta.id}.png`,
      educationalLevel: meta.difficulty,
      learningResourceType: "Interactive Simulation",
      keywords: [meta.name, meta.category, ...meta.tags].join(", "),
      provider: {
        "@type": "Organization",
        name: "AlgoLens",
        url: origin,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: `${meta.name} — Step-by-Step Execution & Complexity`,
      description: meta.description,
      url,
      proficiencyLevel: meta.difficulty,
      author: {
        "@type": "Organization",
        name: "AlgoLens",
      },
    },
  ];
}

export function buildToolJsonLd(
  origin: string,
  path: string,
  name: string,
  description: string
): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: `${origin}${path}`,
      description,
    },
  ];
}
