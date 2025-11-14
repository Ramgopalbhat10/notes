import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { siteMetadata } from "@/lib/site-metadata";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.baseUrl),
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
    ],
    apple: ["/favicon.svg"],
  },
  alternates: {
    canonical: siteMetadata.baseUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
