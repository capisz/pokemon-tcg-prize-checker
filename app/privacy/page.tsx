import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Privacy Policy | PrizeCheck",
  description: "Privacy details for PrizeCheck.",
}

export default function PrivacyPage() {
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
                Privacy Policy
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-emerald-100">
                PrizeCheck Privacy
              </h1>
            </div>

            <p>
              PrizeCheck is designed to run with local app data. The app does not sell personal
              information or require an account to use the deck import and prize checking tools.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Cookies And Storage</h2>
            <p>
              The app stores your cookie preference in a browser cookie named{" "}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-emerald-100">
                pcd_cookie_consent
              </code>
              . It also uses browser local storage for app-only preferences and progress, such as
              whether the help overlay has been seen and saved result stats.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Deck And Card Data</h2>
            <p>
              Imported deck lists are used in your browser to build the practice experience. Card
              metadata is loaded from the app&apos;s local generated data files, while card images
              may load from the image URLs included in that card data.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Contact</h2>
            <p>
              For privacy questions, contact{" "}
              <a
                href="mailto:chriszcodes@gmail.com"
                className="text-emerald-200 underline-offset-2 hover:underline"
              >
                chriszcodes@gmail.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}
