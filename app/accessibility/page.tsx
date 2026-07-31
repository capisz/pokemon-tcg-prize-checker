import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Accessibility | PrizeCheck.us",
  description: "Accessibility statement for PrizeCheck.us.",
}

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-850 via-slate-800 to-slate-850 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-108px)] max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
        <a
          href="/"
          className="w-fit text-xs font-medium text-emerald-200 underline-offset-4 hover:underline"
        >
          Back to PrizeCheck
        </a>

        <section className="rounded-lg border border-slate-700/70 bg-slate-950/45 p-5 shadow-sm shadow-emerald-500/10">
          <div className="space-y-4 text-sm leading-relaxed text-slate-200">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Accessibility
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-emerald-100">
                PrizeCheck Accessibility
              </h1>
            </div>

            <p>
              PrizeCheck.us is built with accessibility in mind so players can use the deck import
              and prize-checking tools as effectively as possible.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Our Goal</h2>
            <p>
              The site aims to follow WCAG 2.2 Level AA guidance for the core web experience. This
              statement is not a formal third-party accessibility certification.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Current Support</h2>
            <p>
              PrizeCheck.us uses semantic page structure, descriptive links, keyboard-focusable
              controls, visible focus states, and text alternatives for non-decorative images where
              practical.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Known Limitations</h2>
            <p>
              The practice game depends on visual Pokémon card images and card-position memory.
              Some card artwork and card text are loaded from external image URLs and may not be
              fully represented as text alternatives.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Feedback</h2>
            <p>
              If you run into an accessibility barrier, contact{" "}
              <a
                href="mailto:chriszcodes@gmail.com"
                className="text-emerald-200 underline-offset-2 hover:underline"
              >
                chriszcodes@gmail.com
              </a>
              . Please include the page, device or browser, assistive technology if applicable,
              and what you were trying to do.
            </p>

            <p className="text-xs text-slate-400">Last updated: July 31, 2026.</p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}
