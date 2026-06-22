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

const MAX_REQUEST_BODY_LENGTH = 20_000
const MAX_CARD_IDS = 256
const CARD_ID_PATTERN = /^[a-z0-9]{2,10}-\d{1,3}[a-z]?$/i

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
    const declaredLength = Number(req.headers.get("content-length") ?? 0)
    if (declaredLength > MAX_REQUEST_BODY_LENGTH) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 })
    }

    const rawBody = await req.text()
    if (rawBody.length > MAX_REQUEST_BODY_LENGTH) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 })
    }

    if (!body || typeof body !== "object" || !Array.isArray((body as { ids?: unknown }).ids)) {
      return NextResponse.json({ error: "Request must include an ids array." }, { status: 400 })
    }

    const rawIds = (body as { ids: unknown[] }).ids
    if (rawIds.length > MAX_CARD_IDS) {
      return NextResponse.json({ error: "Too many card IDs." }, { status: 413 })
    }

    if (rawIds.some((id) => typeof id !== "string" || !CARD_ID_PATTERN.test(id))) {
      return NextResponse.json({ error: "Request contains an invalid card ID." }, { status: 400 })
    }

    const ids = rawIds.map((id) => normalize(id as string))

    if (!ids.length) {
      return NextResponse.json({ cards: [] }, { status: 200 })
    }

    const index = await loadCardIndex()
    const missingIds: string[] = []
    const cards = ids.map((rawId) => {
      const card = resolveCard(rawId, index)
      if (card) return card

      missingIds.push(rawId)
      return placeholderCard(rawId, index)
    })

    return NextResponse.json({ cards, missingIds }, { status: 200 })
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
