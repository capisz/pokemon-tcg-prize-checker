# PrizeCheck engineering plan

## Product direction

Keep guest practice immediate and account-free. Add optional saved decks, history, and targeted training without expanding the default game screen. Preserve the existing visual identity; substantial design changes remain a separate review.

## Milestone 1: Reliable practice engine

- Strict TypeScript builds; remove unused component scaffolding rather than installing its unused dependencies.
- Update vulnerable dependencies and keep the lockfile committed.
- Explicit import → countdown → inspection → guessing → summary phases.
- Measure elapsed inspection time from a deadline. Guess selection remains untimed.
- Independently test parsing, shuffling, evaluation, scoring, and rank transitions.
- Validate card request/response contracts and locally stored rank values.
- Invalidate an imported deck whenever its input changes; ignore stale asynchronous lookup responses.
- Support main and gallery sets sharing an export code.
- Keyboard-operable guesses and accessible dialogs.
- Load advertising only after acceptance; local progress works independently.
- Browser regression tests at desktop and phone sizes, plus continuous integration.

Scoring version 2: `round(1000 × accuracy × (0.7 + 0.3 × remainingInspectionFraction))`.
Accuracy is computed from the exact fraction of correct prizes, before rounding for display. Zero correct guesses earns zero points. Unknown timing earns no speed bonus. Save rank and personal best under versioned keys; retain legacy keys without mixing their results into v2.

The simulation continues to reserve 6 prizes and an 8-card hand. This is a practice convention, not a new claim to implement full tournament setup/mulligan rules.

## Milestone 2: Firebase accounts, saved decks, and history

Use Firebase Authentication and Cloud Firestore instead of Supabase. Keep the Next.js application; do not add a separate service until there is a concrete need.

Target Firestore structure (the first local increment below implements only private deck snapshots):

- `users/{uid}`: profile preferences and schema version; minimal personal data.
- `users/{uid}/decks/{deckId}`: name, active version, created/updated timestamps.
- `users/{uid}/decks/{deckId}/versions/{versionId}`: immutable normalized card counts and source metadata.
- `users/{uid}/sessions/{sessionId}`: immutable deck version reference, mode, timing, scoring version, result, and bounded per-card guesses.
- `users/{uid}/trainingSummaries/{summaryId}`: derived summaries only when query costs justify them.

Implementation requirements:

1. Add optional authentication after practice is already available. Do not require anonymous auth just to run a local game.
2. Build and test Firestore ownership rules with Firebase Emulator Suite. Start with private-by-default collections.
3. Apply server-side authentication and ownership checks to every Admin SDK operation: that SDK bypasses Firestore Security Rules.
4. Use a stable session ID and an atomic create/transaction to prevent duplicate saves during retries. Any derived updates must also be idempotent.
5. Keep old deck versions immutable so previous sessions retain their original meaning.
6. Paginate history, define query indexes, and avoid unbounded real-time subscriptions.
7. Validate stored documents with versioned Zod schemas.
8. Keep private training data out of product analytics. Guest history migration should be explicit and treated as self-reported practice data.
9. Use separate development and production Firebase projects. Do not put Admin credentials in browser bundles.
10. Add account deletion and retention behavior before launching account storage.

Firestore supports count, sum, and average aggregations, but it is not a relational analytics database. Start with bounded per-user history queries. Add server-maintained summaries when measured read volume or dashboard requirements warrant them. More elaborate cohort analysis can be introduced later as a separate analytics pipeline.

No Firebase project, paid resource, credentials, authentication provider, or deployment has been provisioned as part of milestone 1. Firebase SDK integration belongs to milestone 2 and should be exercised against local emulators first.

References:
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/security/rules-query
- https://firebase.google.com/docs/firestore/query-data/aggregation-queries

## Milestone 3: Useful training analytics

Per-deck accuracy, inspection speed at comparable accuracy, repeat mistakes, and trends with sample counts. Preserve mode and scoring version in comparisons. Validate each metric against known recorded sessions.

## Milestone 4: Targeted practice and challenges

Untimed practice, configurable inspection time, missed-card review, and rule-based drill recommendations. Introduce public competition only with server-created sessions and server-evaluated submissions. Local scores are personal practice results, not trusted leaderboard entries.

## Milestone 5: Data operations and interface refinement

Validate incoming card datasets before publishing, retain the last working version, report failed refreshes, and measure actual usability before changing visual hierarchy or layout. Add consent-aware product analytics only with a concrete event plan.

## Budget constraint (September 10, 2026)

The project must remain on Firebase Spark with no billing account. Use browser Authentication and Firestore Security Rules for the first persistence release. Defer Admin SDK services, Cloud Functions, server-maintained summaries, and public ranked competition. Compute initial progress views from paginated user history. Guest practice remains functional when cloud quotas are exhausted. See FIREBASE-SETUP.md for setup and the current implementation boundary.

## Current implementation — September 10, 2026

Implemented locally and exercised with Firebase emulators:

- Optional Google sign-in, a paginated private deck library, editable names/card logos, and immutable list revisions. Updating a list creates a new version; older practice rounds retain the original version.
- A single Decks/Progress dialog, collapsed save form, secondary actions menu, last-practiced metadata, and nearby feedback. Import remains inside the paste area.
- Account-specific device history plus immutable Firestore sessions, stable IDs for retry deduplication, explicit guest-history transfer, pagination, and retry controls. Guest records are never automatically assigned to a signed-in account.
- Per-revision and per-mode accuracy, timing, sample counts, and missed-card counts. Replay loads the recorded revision through import validation. Older records without source text cannot be replayed.
- 60-, 120-, 180-second and untimed inspection. Only standard 120-second rounds change standard rank; comparisons separate modes.
- Reauthenticated account deletion, paginated data removal, and privacy-copy updates. A minimal deletion marker remains to reject in-flight writes after deletion begins. Failed deletion can be retried; the multi-step process is not atomic.

Local history is capped at 100 records per account or guest browser. Cloud history is paginated (25 per page) and retained until explicitly cleared/deleted. Statistics describe the records loaded, not an unbounded lifetime aggregate. Missed-copy counts are not exposure-adjusted difficulty. Last-practiced hints derive from the latest fetched sessions.

## Live verification and release boundary

The developer CLI login and access to `prizecheck-f33ad` were verified. Its existing default Firestore database is Standard edition in `us-central1`, with `freeTier: true`. Google sign-in is enabled. Authorized domains include `localhost`, `prizecheck.us`, and Firebase defaults; `www.prizecheck.us` is not configured.

No cloud configuration, rules, or hosting deployment was changed in this implementation. A real browser Google OAuth smoke test and deliberate production rules/app release remain. The current preview uses the isolated `demo-prizecheck` emulators; CLI login does not switch the app to live Firebase. Keep Spark and no linked billing account.

## Later work, outside this increment

Expose complete revision browsing if users need it; current history already replays the exact referenced version. Add data-export tooling and more advanced training recommendations after validating the current workflow. Public leaderboards require trusted server evaluation and remain out of scope. Do not add paid infrastructure solely to increase stack size.
