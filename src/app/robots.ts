import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated app + API are not for indexing.
      disallow: ["/dashboard", "/buyers", "/products", "/shipments", "/documents", "/settings", "/billing", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
