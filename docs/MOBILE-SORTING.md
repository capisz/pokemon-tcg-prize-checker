# Mobile sorting prototype

Horizontal swipes browse one card per gesture. Move to front / Move to back buttons work with touch, keyboard, and assistive technology. Desktop A/D, arrow keys, mouse wheel, and click/context-menu behavior remain available.

Sorting gestures start off for every round. Enabling them reserves vertical drags on cards for sorting: up sends the current card to the front, down to the back. Scroll outside the cards in this mode. Pinch zoom remains allowed. With sorting gestures off, vertical scrolling remains native.

A browse requires 45 CSS pixels; sorting requires 65. The dominant axis must exceed the other by 1.5 times. Small movements, diagonal drags, cancellation, and additional fingers do not commit a sort. Actions occur on release. Touch taps do not invoke desktop click-to-front. Movement remains entirely manual.

Hold arrows or move buttons for 350 ms to repeat every 130 ms; release, cancellation, loss of focus, or reaching a disabled boundary stops repetition. A deck-position slider and First/Last buttons enable long jumps without sorting. Moving the current card to the front advances to the next untouched card. Card images disable native selection and touch callouts. Selected prize guesses retain readable art with a small badge.

First compare these controls on a physical phone with untimed rounds, using the same deck and task: group copies of several names. Compare buttons versus gestures for time, unintended moves, recovery effort, and comfort. Include repeated moves, first/last-card boundaries, browser scrolling, pinch zoom, interruption by a second finger, VoiceOver/TalkBack, and landscape. Automated pointer tests verify routing, not native phone speed or scrolling arbitration. Do not finalize the interaction until this check is complete.

## Hosted preview boundary

All Vercel deployments (preview and production) disable Firebase account features regardless of inherited Firebase configuration. Local emulator builds retain account testing. Production promotion, children's account/consent policy, live Firebase verification, accessibility review, and external data/permissions review remain separate release gates.

## Clipboard and phone demo

Copy Decklist writes a plain-text clipboard item, with a textarea fallback for HTTP on the local network. Import normalizes up to two percent-encoding layers before the existing security and deck validation. Use this deck imports featured lists directly.

For a guest-only LAN demo, build with `VERCEL_ENV=preview npm run build`, then run `npm run start -- --hostname 0.0.0.0 --port 3200`. Open the Mac LAN address on a phone on the same Wi-Fi. Do not expose this server through router forwarding. Account features are intentionally disabled in this build.

## Holographic cards and glow

All card-art surfaces use the shared CardFoil component for names containing a standalone ex label. The 248px star mask in public/effects/ex-star.png was extracted from the first 8-bit sampled brush in the user-supplied Star Particles ex.abr (version 6.2, PackBits). The supplied .sutg is an alternative brush container and is not shipped to browsers. The extracted PNG is about 4 KB. Stars and a restrained rainbow sheen are decorative, never capture taps, and stop animating with reduced motion.

The carousel uses a radial background that reaches transparency before its clipping edges, rather than oversized clipped card shadows. Hosted account features and advertising remain disabled for this release; local Firebase emulator work is unchanged.
