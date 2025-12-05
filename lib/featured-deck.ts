// lib/featured-deck.ts

export type FeaturedDeckCardId = string;

export type StaticFeaturedDeck = {
  title: string;          // Deck name
  tournamentLabel: string; // e.g. "Stuttgart Regionals – 1st place"
  sourceUrl: string;      // Limitless deck URL
  cardIds: FeaturedDeckCardId[];
  exportText: string;     // Text to copy into your app
};

// TEMP: fill this manually once.
// 1. Go to https://limitlesstcg.com/decks/list/22011
// 2. Click their "Copy to Clipboard" button
// 3. Paste into exportText below.
// 4. Fill cardIds with ids in your app format ("paf-7", "obf-125", ...)

export const staticFeaturedDeck: StaticFeaturedDeck = {
  title: "Gardevoir ex",              // <- whatever the deck title is
  tournamentLabel: "Most recent major event – 1st place",
  sourceUrl: "https://limitlesstcg.com/decks/list/22011",
  cardIds: [
    // TODO: fill this with all card ids your /api/cards expects,
    // e.g. "paf-7", "paf-11", "obf-125", ...
  ],
  exportText: `PASTE THE OFFICIAL LIMITLESS DECK TEXT HERE`,
};
