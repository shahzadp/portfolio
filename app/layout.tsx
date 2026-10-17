import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site.generated";
import { assetUrl } from "./paths";

/* Fonts from the design mockup - self-hosted by next/font, so no runtime
   request to Google and no layout shift. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/* Palette kept in step with app/globals.css. The manifest carries the same
   pair; tests/ pwa.spec.ts asserts the three stay identical. */
const CREAM = "#EFE6D2";

export const metadata: Metadata = {
  title: `${site.name} · ${site.role}`,
  description: site.bio,
  metadataBase: new URL(site.url),
  applicationName: site.name,
  manifest: assetUrl("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: assetUrl("/favicon.ico")!, sizes: "any" },
      { url: assetUrl("/icons/icon-192.png")!, type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: assetUrl("/icons/apple-touch-icon.png")!, sizes: "180x180" }],
  },
  other: {
    /* appleWebApp.capable emits the unprefixed mobile-web-app-capable, but
       iOS is what actually reads apple-mobile-web-app-capable when deciding
       whether Add to Home Screen opens standalone. Both are needed. */
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: `${site.name} · ${site.role}`,
    description: site.bio,
    url: site.url,
    siteName: site.name,
    images: [assetUrl(site.portrait)!],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} · ${site.role}`,
    description: site.bio,
    images: [assetUrl(site.portrait)!],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: CREAM,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${sourceSans.variable} ${plexMono.variable}`}>
      <body>
        {children}

        {/* GoatCounter: cookie-free, no personal data, no consent banner
            needed under GDPR for a site this size. Loaded after interactive
            so it never competes with first paint. */}
        <Script
          id="goatcounter"
          src="https://gc.zgo.at/count.js"
          data-goatcounter="https://sikander.goatcounter.com/count"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}