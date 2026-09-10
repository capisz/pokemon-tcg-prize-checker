// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import "@fontsource-variable/inter"
import { CookieConsent } from "@/components/cookie-consent"


const siteUrl = "https://prizecheck.us"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PrizeCheck.us",
  description: "Practice guessing your prize cards like a tournament grinder.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PrizeCheck.us",
    description: "Practice guessing your prize cards like a tournament grinder.",
    url: siteUrl,
    siteName: "PrizeCheck.us",
    images: [
      {
        url: `${siteUrl}/prizecheck-og.png`,
        width: 1200,
        height: 630,
        alt: "PrizeCheck.us game summary screen",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrizeCheck.us",
    description: "Practice guessing your prize cards like a tournament grinder.",
    images: [`${siteUrl}/prizecheck-og.png`],
  },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>

      </head>
      <body className="min-h-screen" style={{ fontFamily: '"Inter Variable", sans-serif' }}>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
