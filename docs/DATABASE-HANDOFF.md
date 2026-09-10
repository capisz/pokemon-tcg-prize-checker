# PrizeCheck database work handoff

Workspace: /Users/admin/Downloads/pokemon-tcg-prize-checker-main
Repository: https://github.com/capisz/pokemon-tcg-prize-checker
Production: https://www.prizecheck.us

Continue the Firebase account/database work. First inspect the current checkout and remote; preserve all work and never force-push. The latest release adds stationary rainbow ex foil, diagonal streaks, and a soft gradient across the star field on mobile and desktop. Preserve the approved UI and guest practice.

## Current boundary

Firebase project prizecheck-f33ad must stay Spark with no billing. Hosted accounts are deliberately disabled by NEXT_PUBLIC_FIREBASE_ACCOUNTS_DISABLED in next.config.mjs whenever VERCEL_ENV is set. Ads are disabled. Do not remove these boundaries as a routine configuration fix. Children under 13 and international access are intended; the account/consent approach is unresolved. An age checkbox alone is not a solution.

Local emulators use demo-prizecheck: Auth 9099, Firestore 8080, UI 4000. Production project configuration must never redirect emulator tests to the live database. Never commit .env.local, credentials, logs, exports, or browser artifacts.

## Implemented

Google login UI; saved decks and editable names/logos; immutable deck revisions; practice sessions; Progress statistics/coaching; card-name aggregation across printings with older-record compatibility; account-scoped IndexedDB queue with stable IDs, retry/backoff, clear-history epochs and deletion protection; explicit guest-history transfer and account deletion.

Read docs/PROGRESS-SYNC.md, docs/FIREBASE-SETUP.md, firestore.rules, lib/firebase/client.ts, and the account/sync implementation before changing it.

## Next steps

1. Audit actual production Firebase setup read-only: Standard free-tier database, region, deployed rules, Google provider, authorized domains including www.prizecheck.us, and hosting configuration. Earlier observations are historical, not current verification.
2. Run unit and emulator/rules checks, then account browser tests separately. Rules tests clear demo data: never run concurrently with browser tests or against production.
3. Review children’s account/privacy design with the user before enabling hosted accounts. Review collection, deletion-marker retention, international access, hosting and external-image data flows. Do not claim universal legal compliance.
4. Once the release approach is approved, test real Google OAuth and persistence across two independent live browser sessions in an isolated configuration, verify owner isolation, logout/account switching, offline queue recovery, clear history, and deletion.
5. Deploy tested rules deliberately and enable hosted accounts only after these gates pass. Keep production changes separate and reviewable; never enable paid Firebase products.

Prior account checks: 38 unit tests, 14 rules tests in earlier work; independent emulator sessions and offline reload/reconnect were verified. Reverify for database changes. Latest foil checks cover desktop/mobile preview and game, decorative pointer behavior, and reduced motion. These visual tests do not validate production Firebase.

GitHub connector has authenticated repository access; gh CLI was not authenticated previously. Two Vercel integrations deploy the same repository. Inspect current deployment status before assuming success.
