import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/projects", "/agents", "/settings", "/auth/"],
      },
    ],
    sitemap: "https://forgems.vercel.app/sitemap.xml",
  }
}
