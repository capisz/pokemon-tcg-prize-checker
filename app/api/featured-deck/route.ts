import { NextResponse } from "next/server"

const FEATURED_DECK_TITLE =
  "Charizard ex / Pidgeot ex — Regional Stuttgart Champion" // ASCII-only
const FEATURED_DECK_URL = "https://limitlesstcg.com/decks/list/22011"

// Paste the FULL PTCGL import text for that deck between the backticks.
const FEATURED_DECK_IMPORT_TEXT = `
Pokémon: 4
2 Charmander PAF 7
1 Charmeleon PFL 12
2 Charizard ex OBF 125

Trainer: 4
1 Prime Catcher TEF 157

Energy: 4
4 Fire Energy SVE 2
`.trim()

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
