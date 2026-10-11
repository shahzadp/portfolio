import type { NextConfig } from "next";

/**
 * Deployment base path.
 *
 * A repo named `<user>.github.io` is served from the domain root, so it needs
 * no base path. Any other repo is a *project* site and is served from a
 * sub-path, e.g. https://shahzadp.github.io/sikander/.
 *
 * Set BASE_PATH in the deploy workflow to match the repository name:
 *   BASE_PATH=""              user site    https://shahzadp.github.io/
 *   BASE_PATH="/sikander"     project site https://shahzadp.github.io/sikander/
 */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  /* Static export. The site is deployed as plain files with no Node server at
     runtime, which keeps the deploy a static host. */
  output: "export",

  /* The image optimizer is a server feature; unavailable in static export.
     next/image still gives lazy-loading, decoding and fixed dimensions. */
  images: { unoptimized: true },

  /* Emit /index.html for / so any file-based host resolves the root cleanly. */
  trailingSlash: true,

  /* Next prefixes its own assets with basePath, but not paths that come from
     our content (portrait, CV PDF). Expose the prefix so those can be
     prefixed too, otherwise they 404 on a project site. */
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;