import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL;
  const routes = ["", "/pricing", "/terms", "/privacy", "/refund", "/login", "/signup"];
  // Static last-modified to keep builds deterministic (no Date.now()).
  const lastModified = "2026-06-25";
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
