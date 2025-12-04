// components/site-footer.tsx
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-800 bg-emerald-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-start sm:justify-between sm:text-sm">
        {/* Left: contact + other apps */}
        <div className="space-y-2">
          <p className="text-emerald-900 font-semibold text-sm">
            PrizeCheckDrillr.io
          </p>
          <div className="flex flex-wrap gap-4 text-sky-400">
            {/* Swap these links for whatever you want */}
            <Link
              href="mailto:chriszcodes@gmail.com"
              className="hover:text-sky-500 text-emerald-900"
            >
              Contact
            </Link>
            <Link
              href="https://github.com/capisz"
              className="hover:text-sky-500 text-emerald-900"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </Link>
            <Link
              href="https://dragapultist.vercel.app"
              className="hover:text-sky-500 text-emerald-900"
              target="_blank"
              rel="noreferrer"
            >
              Dragapultist (Pokémon TCG Analyzer)
            </Link>
          </div>
        </div>

        {/* Right: legal disclaimer */}
        <p className="max-w-xl leading-relaxed text-[11px] sm:text-xs text-slate-500">
          The literal and graphical information presented on this website about
          the Pokémon Trading Card Game, including card images and text, is
          copyright The Pokémon Company (Pokémon), Nintendo, Game Freak and/or
          Creatures. This website is not produced by, endorsed by, supported by,
          or affiliated with Pokémon, Nintendo, Game Freak or Creatures.
        </p>
      </div>
    </footer>
  )
}
