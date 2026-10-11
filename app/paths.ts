/**
 * URL helper for paths that come from our own content rather than from Next.
 *
 * Next.js prefixes the assets it emits (/_next/...) with `basePath`
 * automatically, but a path written in content/site.ts, such as
 * "/portrait.jpg" or "/resume.pdf", is rendered verbatim and would 404 on a
 * project site like https://shahzadp.github.io/sikander/.
 *
 * Values are inlined at build time from NEXT_PUBLIC_BASE_PATH, which
 * next.config.ts sets alongside `basePath`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a root-relative path with the deployment base path. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return path; // already absolute (http/https)
  return `${BASE_PATH}${path}`;
}