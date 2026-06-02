// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { CookieConsent } from "@/components/cookie-consent"

const inter = Inter({ subsets: ["latin"] })

// app/layout.tsx (or app/page.tsx)

export const metadata: Metadata = {
  title: "PrizeCheckDrillr.io",
  description: "Practice guessing your prize cards like a tournament grinder.",
  openGraph: {
    title: "PrizeCheckDrillr.io",
    description: "Practice guessing your prize cards like a tournament grinder.",
    url: "https://prize-checkr-io.vercel.app/",
    siteName: "PrizeCheckDrillr.io",
    images: [
      {
        url: "https://prize-checkr-io.vercel.app/prizecheckdrillr-og.png",
        width: 1200,
        height: 630,
        alt: "PrizeCheckDrillr game summary screen",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrizeCheckDrillr.io",
    description: "Practice guessing your prize cards like a tournament grinder.",
    images: ["https://prize-checkr-io.vercel.app/prizecheckdrillr-og.png"],
  },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}>
        {children}
        <CookieConsent />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7765754071910029"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
