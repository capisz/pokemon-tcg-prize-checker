import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { MusicProvider } from "@/components/music-player"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PrizeCheckDrillr.io",
  description: "Prize mapping trainer for competitive Pokémon TCG",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MusicProvider>
          {children}
        </MusicProvider>
      </body>
    </html>
  )
}
