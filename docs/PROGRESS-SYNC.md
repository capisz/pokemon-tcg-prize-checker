# Progress and sync

Progress compares the selected exact deck revision and duration. Prize groups combine card names across printings, including printings whose effects differ. New rounds retain original deck quantity, actual prized quantity, and missed quantity for each prized name. Legacy rounds contribute timing/accuracy only. Frequencies are observations, with recorded-round denominators, rather than predicted draw probabilities.

Coaching uses the latest ten comparable rounds, requires five for personalized advice, and prioritizes inspection time, missed one-ofs, then large quantities. Untimed rounds do not receive a speed judgment.

Saved deck names live on their existing parent document. Unbound account history uses private `historyNames/{sha256(deckKey)}` overrides. Guest names remain local. Historical card lists remain immutable.

Pending account rounds live in IndexedDB (`prizecheck-sync`), separately from the 100-round local display cache. Session IDs remain stable across retries. Sign-in, reconnect and manual retry trigger uploads; failures back off from one second to a maximum of sixty seconds. First account initialization needs a connection to establish the current history generation.

`account/history` contains a monotonic epoch and a clearing flag. Clearing cancels the local queue, increments the server epoch before deleting records, and unblocks only after cleanup. Old epochs cannot write again. The account-deletion marker blocks writes during account cleanup. Failed cleanup can be retried; these small control documents deliberately remain as tombstones. Queued rounds from a cleared epoch are discarded. Browser storage removal also removes pending offline work.

To stay below Firestore's rule-evaluation limit, new cloud records store missed quantities in `prizeGroups`; their redundant legacy `missed` array is empty. Old records keep their original array. Client schema validation verifies grouped totals; rules enforce ownership, field bounds, immutable records, and epoch checks.

## Release gate

The preview uses Auth/Firestore emulators. No paid services or billing changes are required. Before a separate production release, deploy the reviewed rules to the intended project and verify actual Google sign-in plus saved decks and progress in two independent browser sessions. Emulator tests do not prove production OAuth configuration. Keep guest transfer explicit.

Run `npm run check`, `npm run test:rules` with emulators running, build, and `FIREBASE_E2E=true npm run test:e2e` against an emulator-configured build. Rules tests clear the demo database, so run them before browser tests, not concurrently.
