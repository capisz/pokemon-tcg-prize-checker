import { NextResponse } from "next/server"

const FEATURED_DECK_TITLE =
  " Charizard 𝘦𝘹 / Pidgeot 𝘦𝘹 — Regional Stuttgart Champion" // change as needed
const FEATURED_DECK_URL = "https://limitlesstcg.com/decks/list/22011"

// Paste the FULL PTCGL import text for that deck between the backticks.
// You can grab it from the Limitless "Copy / Export" area for that list.
const FEATURED_DECK_IMPORT_TEXT = `
Pokémon: 4
2 Charmander PAF 7
1 Charmeleon PFL 12
1 Charizard ex OBF 125

Trainer: 4
4 Ultra Ball PAF 80

Energy: 4
4 Fire Energy SVE 2
`.trim()
// ^^^ Replace the above with the REAL list from Limitless later.
// This sample is just to prove the feature works.

export async function GET() {
  if (!FEATURED_DECK_IMPORT_TEXT) {
    return NextResponse.json(
      { error: "No featured deck configured yet" },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      title: FEATURED_DECK_TITLE,
      sourceUrl: FEATURED_DECK_URL,
      importText: FEATURED_DECK_IMPORT_TEXT,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  )
}
