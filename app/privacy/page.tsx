import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Privacy Policy | PrizeCheck.us",
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
              The app uses browser storage for preferences and practice progress. Pending
              account uploads are stored in IndexedDB until synchronized or cleared. An older
              advertising-choice cookie may remain in your browser, but it is not used to load advertising.
            </p>

            <h2 className="text-base font-semibold text-emerald-100">Optional Accounts And Practice History</h2>
            <p>Signing in with Google enables private saved decks, card-logo selections, deck revisions, and practice history through Firebase Authentication and Cloud Firestore. Google provides account identifiers and basic profile information such as your email and display name. Practice records include deck lists, inspection timing, mode, accuracy, and missed cards. These are personal practice results, not verified competitive scores.</p>
            <p>Guest rounds remain on this browser. Transferring guest history to an account requires an explicit confirmation and may include rounds played by other people on the same device. The latest 100 device records are retained per guest/account storage area; account records remain until you delete them. Names and logos for saved decks are shared across the library and account progress views.</p>
            <p>You can clear guest history on this device, clear account history, delete saved decks, or delete your account from My decks. Account deletion first asks you to confirm your Google identity, then removes stored deck revisions and history before removing the Firebase account. Deletion can require a retry if interrupted. A minimal deletion marker containing only the deleting flag under the former account ID remains to prevent delayed requests from recreating data. Guest history is not removed by account deletion. Browser backups or copies on other devices are not erased by clearing this browser’s storage.</p>
            <p>In local-demo mode, authentication and database operations use local Firebase emulators rather than the live project. Test records can disappear when emulators restart.</p>

            <h2 className="text-base font-semibold text-emerald-100">Advertising</h2>
            <p>Advertising is disabled in this release. PrizeCheck does not load Google AdSense, including when an earlier advertising choice was accepted.</p>

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
