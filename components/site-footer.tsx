"use client"

import Link from "next/link"
import { FooterMusicControls } from "@/components/music-player" // or MusicControls if that's what you're using

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-200/60 bg-emerald-100/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 md:flex-row md:items-center md:justify-between">
        {/* Left: title + links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-emerald-900">
            PrizeCheckDrillr.io
          </p>
          <p className="text-xs text-emerald-900/80">
            Use this and the tools below to become a better player.
          </p>

          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-emerald-900/80">
           
            <Link
              href="https://dragapultist.vercel.app"
              target="_blank"
              className="hover:underline"
            >
              Dragapultist (Pokémon TCG Analyzer)
            </Link>
            <Link
              href="https://tcgmasters.net"
              target="_blank"
              className="hover:underline"
            >
              TCG Masters (Matchup Simulator)
            </Link>
            <Link
              href="https://limitlesstcg.com/decks/lists"
              target="_blank"
              className="hover:underline"
            >
              LimitlessTCG (Deck Database)
            </Link>
             <Link href="mailto:chriszcodes@gmail.com" className="hover:underline">
              Contact
            </Link>
          </nav>
        </div>

        {/* Middle: disclaimer */}
        <p className="max-w-xl text-[10px] leading-relaxed text-emerald-900/80">
          The literal and graphical information presented on this website about the Pokémon
          Trading Card Game, including card images and text, is © The Pokémon Company, Nintendo,
          Game Freak, and/or Creatures. This website is not produced by, endorsed by, supported by,
          or affiliated with those companies.
        </p>

        {/* Right: volume slider only */}
        <div className="flex items-center justify-end gap-3">
          <FooterMusicControls />
        </div>
      </div>
    </footer>
  )
}
