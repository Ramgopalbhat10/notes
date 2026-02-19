import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { siteMetadata } from "@/lib/site-metadata";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-family-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-family-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.baseUrl),
  applicationName: siteMetadata.product,
  title: {
    default: siteMetadata.title,
    template: `%s | ${siteMetadata.product}`,
  },
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
  authors: [{ name: siteMetadata.creator }],
  creator: siteMetadata.creator,
  publisher: siteMetadata.creator,
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.baseUrl,
    siteName: siteMetadata.product,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", rel: "shortcut icon" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteMetadata.shortName,
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: siteMetadata.baseUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  );
}
