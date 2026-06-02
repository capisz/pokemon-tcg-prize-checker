import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const runtime = "nodejs"

type IndexedCard = {
  id: string
  name: string
  image?: string
  set: string
  number: string | number
}

type CardIndex = {
  sourceCommit?: string | null
  cardsById: Record<string, IndexedCard>
  setCodeToId: Record<string, string>
  setNameById?: Record<string, string>
  setNameByCode?: Record<string, string>
}

const CARD_INDEX_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "card-index.json",
)

let cardIndexPromise: Promise<CardIndex> | null = null

function normalize(value: string | number | undefined | null) {
  return String(value ?? "").trim().toLowerCase()
}

function buildId(setId: string, number: string) {
  return `${normalize(setId)}-${normalize(number)}`
}

async function loadCardIndex(): Promise<CardIndex> {
  if (!cardIndexPromise) {
    cardIndexPromise = fs
      .readFile(CARD_INDEX_PATH, "utf8")
      .then((raw) => JSON.parse(raw) as CardIndex)
      .catch((error) => {
        cardIndexPromise = null
        throw error
      })
  }

  return cardIndexPromise
}

function resolveCard(rawId: string, index: CardIndex) {
  const [liveSetCode, cardNumber] = rawId.split("-")
  if (!liveSetCode || !cardNumber) return null

  const code = normalize(liveSetCode)
  const number = normalize(cardNumber)
  const canonicalSetId = index.setCodeToId[code] ?? code

  const match =
    index.cardsById[buildId(canonicalSetId, number)] ??
    index.cardsById[buildId(code, number)]

  if (!match) return null

  return {
    id: rawId,
    name: match.name,
    image: match.image,
    set: match.set,
    number: match.number || cardNumber,
  }
}

function getSetDisplayName(setCode: string | undefined, index: CardIndex) {
  if (!setCode) return "Unknown Set"

  const code = normalize(setCode)
  const canonicalSetId = index.setCodeToId[code] ?? code

  return (
    index.setNameByCode?.[code] ??
    index.setNameById?.[canonicalSetId] ??
    canonicalSetId.toUpperCase()
  )
}

function placeholderCard(rawId: string, index: CardIndex) {
  const [setCode, number] = rawId.split("-")

  return {
    id: rawId,
    name: `Card ${rawId.toUpperCase()}`,
    image: undefined,
    set: getSetDisplayName(setCode, index),
    number: number?.toUpperCase() ?? "??",
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []

    if (!ids.length) {
      return NextResponse.json({ cards: [] }, { status: 200 })
    }

    const index = await loadCardIndex()
    const cards = ids.map((rawId) => resolveCard(rawId, index) ?? placeholderCard(rawId, index))

    return NextResponse.json({ cards }, { status: 200 })
  } catch (err) {
    console.error("Error in /api/cards:", err)
    return NextResponse.json(
      {
        error:
          "Failed to load cards. Run `npm run build:card-index` to regenerate the local card index.",
      },
      { status: 500 },
    )
  }
}
