"use client"

import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mobile-footer border-t border-emerald-200/60 bg-emerald-100/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 md:flex-row md:items-center md:justify-between">
        {/* Left: title + links */}
        <div className="footer-links space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-emerald-900">
            PrizeCheck.us
          </p>
          <p className="text-xs text-emerald-900/80">
            Use this and the tools below to become a better player.
          </p>

          <nav aria-label="Footer" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-emerald-900/80">
            <div className="footer-tools sm:contents"><h2 className="sm:hidden font-semibold">Other tools</h2>
            <Link
              href="https://dragapultist.vercel.app"
              target="_blank"
              className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900"
            >
              Dragapultist<span className="hidden sm:inline"> (Pokémon TCG Analyzer)</span>
            </Link>
            <Link
              href="https://tcgmasters.net"
              target="_blank"
              className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900"
            >
              TCG Masters<span className="hidden sm:inline"> (Matchup Simulator)</span>
            </Link>
            <Link
              href="https://limitlesstcg.com/decks/lists"
              target="_blank"
              className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900"
            >
              LimitlessTCG<span className="hidden sm:inline"> (Deck Database)</span>
            </Link>
            </div>
            <div className="footer-site sm:contents"><h2 className="sm:hidden font-semibold">PrizeCheck.us</h2>
            <Link href="/privacy" className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900">
              Privacy
            </Link>
            <Link href="/accessibility" className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900">
              Accessibility
            </Link>
            <Link href="mailto:chriszcodes@gmail.com" className="inline-flex min-h-11 sm:min-h-6 items-center rounded px-1 sm:px-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900">
              Contact
            </Link>
            </div>
          </nav>
        </div>

        {/* Middle: disclaimer */}
        <p className="max-w-xl text-[10px] leading-relaxed text-emerald-900/80">
          The literal and graphical information presented on this website about the Pokémon
          Trading Card Game, including card images and text, is © The Pokémon Company, Nintendo,
          Game Freak, and/or Creatures. This website is not produced by, endorsed by, supported by,
          or affiliated with those companies.
        </p>
      </div>
    </footer>
  )
}
