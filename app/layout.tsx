import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pokémon TCG Prize Checker",
  description: "Test your memory by identifying prize cards in your Pokémon TCG deck",
  icons: {
    icon: [
      {
        url: "/public/favicon.ico",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/public/favicon.ico",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/public/favicon.ico",
        type: "icon/png",
      },
    ],
    apple: "/public/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        
      </body>
    </html>
  )
}
