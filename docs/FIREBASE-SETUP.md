# Firebase setup: no billing

Use the Spark plan with no linked billing account. Keep the existing Next.js hosting arrangement. Firebase is only for optional authentication and small private training records.

1. Create a Firebase project on Spark; Google Analytics is not needed.
2. Register a Web app in Project Settings. Skip hosting setup.
3. In Authentication, enable Google and select your support email. Under Settings / Authorized domains, add `localhost` for local testing and `prizecheck.us` for the live site. Add `www.prizecheck.us` only if used. Use http://localhost:3000 for local Google sign-in.
4. Create Cloud Firestore, Standard edition, default database, in production mode. Pick a region near your users; record it because changing location later is not a simple settings change.
5. Copy .env.example to .env.local and populate the four Web app configuration fields. No service-account key is needed. Restart/rebuild Next.js after editing these values.
6. Keep production rules closed until owner-specific access and document-validation rules have passed emulator tests. The checked-in rules support owner-specific decks, immutable revisions/sessions, and deletion markers. Live rules have not been deployed.

Do not enable Blaze, billing, Cloud Functions, Cloud Run, Firebase App Hosting, Cloud Storage, Extensions, phone/SMS authentication, or paid analytics integrations for this milestone. If the console asks to upgrade or link billing, stop that setup step; this design does not require it.

Architecture under Spark:
- Google sign-in through the browser SDK.
- Firestore access controlled by ownership and document-validation rules.
- Paginated, on-demand deck/history reads, not unlimited live subscriptions.
- Existing card images remain at their current URLs, not copied into Firebase Storage.
- Initial analytics derived from bounded user history; no scheduled Cloud Functions.
- Guest practice remains independent of Firebase availability or quotas.

## Local development (implemented September 10, 2026)

The My decks dialog offers Google sign-in, saving a validated deck, a paginated private library (20 records per request), loading through the existing import validation, owner-only renaming, filtering the loaded page by name, and confirmed deletion. Guest practice does not initialize Firebase. Emulator mode uses the hardcoded `demo-prizecheck` project, regardless of the production project ID in `.env.local`.

1. Install dependencies with `npm ci`.
2. Install a Java 21 runtime. For this session, a free Temurin runtime was downloaded to `/private/tmp/prizecheck-java21/Contents/Home`; this temporary location can be removed by the OS. Use a permanent Java installation for ongoing development.
3. Set `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true` in `.env.local`.
4. Start emulators with `npm run emulators`. For the temporary runtime on this Mac:

   ```sh
   JAVA_HOME=/private/tmp/prizecheck-java21/Contents/Home PATH=/private/tmp/prizecheck-java21/Contents/Home/bin:$PATH npm run emulators
   ```

5. In another terminal, run `npm run dev`, then open http://localhost:3000.
6. Import a valid deck, open My decks, select Continue with Google, and create a fictional account in the emulator popup. This is a local simulation, not real Google OAuth.

Local ports: Auth 9099, Firestore 8080, emulator UI http://127.0.0.1:4000. No Firebase login or billing account is needed. Emulator data is temporary and resets on restart unless explicitly exported; it is not synchronized to the live project.

Validation:
- `npm run check`: TypeScript, unit/API tests, card dataset checks.
- `npm run check:rules`: starts isolated emulators and runs ownership/schema tests (requires Java 21 and free emulator ports).
- With emulators already running: `npm run test:rules`.
- Build with emulator mode enabled, then run `FIREBASE_E2E=true npm run test:e2e` while emulators are running for browser account tests.
- CI builds in emulator mode and runs rules plus browser tests without cloud credentials.

## Data contract and launch boundary

A saved deck has a name, optional card logo, schemaVersion, createdAt, and activeVersion. Each immutable version contains source text, cardCount 60, schemaVersion, and createdAt. Initial creation and revision changes are atomic. Deletion paginates all versions before removing the parent. Loading revalidates source through the card API; rules enforce ownership and document shape, not game legality.

Account practice sessions are immutable and deduplicated by stable IDs. They reference a saved deck/version when available, retain source for new rounds, and include mode, timing, correct count, and bounded missed-card counts. History reads 25 records per page. Guest transfer is explicit; device history is separately scoped by account and capped at 100 records. Clearing account history removes cloud sessions and that account's device records.

Account deletion reauthenticates with Google, creates `users/{uid}/account/deletion`, deletes sessions and deck versions in bounded batches, then deletes the Auth user. The minimal marker remains to prevent queued writes from recreating data. Retry after a partial failure; guest history remains separately controlled. Privacy copy reflects this behavior.

Verified through the developer's CLI login: project access, Standard default database in `us-central1` with the free tier enabled, Google provider enabled, and authorized domains `localhost` and `prizecheck.us` plus Firebase defaults. Add `www.prizecheck.us` only if that hostname will be used. No live settings or rules were changed. The browser SDK config is public configuration, not an Admin credential.

Before release, test real Google OAuth in a separate live-mode build and deliberately deploy the tested rules and app. The current preview stays in emulator mode. A Firebase CLI login alone does not switch the application to production or verify browser OAuth.

Official reference: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

Deck logos: optional `coverCardId` on the saved-deck document identifies a card from the imported list. The client verifies membership before saving; rules restrict ownership, mutable fields, and the ID shape. Card names/images are resolved through the existing local card API. No image uploads or Firebase Storage are used. Older decks remain compatible and show an initial until a logo is chosen. Click a saved deck's thumbnail to choose another card.
