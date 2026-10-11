import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site.generated";
import { assetUrl } from "./paths";

/* Fonts from the design mockup — self-hosted by next/font, so no runtime
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

export const metadata: Metadata = {
  title: `${site.name} · ${site.role}`,
  description: site.bio,
  metadataBase: new URL(site.url),
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${sourceSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}