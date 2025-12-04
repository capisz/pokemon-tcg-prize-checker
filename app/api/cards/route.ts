// app/api/cards/route.ts
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const runtime = "nodejs"

type LocalCard = {
  id?: string
  name?: string
  images?: { small?: string; large?: string }
  imageUrl?: string
  imageUrlHiRes?: string
  set?: { id?: string; name?: string }
  number?: string
}

type SetEntry = {
  id?: string
  ptcgoCode?: string
}

const CARDS_BASE_PATH = path.join(
  process.cwd(),
  "TCGdata",
  "pokemon-tcg-data-master",
  "cards",
  "en"
)

const SETS_FILE_PATH = path.join(
  process.cwd(),
  "TCGdata",
  "pokemon-tcg-data-master",
  "sets",
  "en.json"
)

// Caches so we don't re-read from disk every request
let allCardsCache: LocalCard[] | null = null
let setCodeMapCache: Record<string, string> | null = null

async function loadSetCodeMap(): Promise<Record<string, string>> {
  if (setCodeMapCache) return setCodeMapCache

  try {
    const raw = await fs.readFile(SETS_FILE_PATH, "utf8")
    const sets: SetEntry[] = JSON.parse(raw)

    const map: Record<string, string> = {}

    for (const set of sets) {
      const id = set.id
      const code = set.ptcgoCode
      if (!id || !code) continue
      // ptcgoCode (what Live exports use) -> internal set id
      map[code.toLowerCase()] = id.toLowerCase()
    }

    setCodeMapCache = map
    console.log(
      `Loaded ${Object.keys(map).length} set code mappings from sets/en.json`
    )
    return map
  } catch (err) {
    console.error("Failed to load set code map from sets/en.json:", err)
    // Fallback: empty map, so we just use the raw set code
    setCodeMapCache = {}
    return setCodeMapCache
  }
}

async function loadAllCards(): Promise<LocalCard[]> {
  if (allCardsCache) return allCardsCache

  const files = (await fs.readdir(CARDS_BASE_PATH)).filter((f) =>
    f.endsWith(".json")
  )
  const result: LocalCard[] = []

  for (const file of files) {
    const filePath = path.join(CARDS_BASE_PATH, file)
    try {
      const raw = await fs.readFile(filePath, "utf8")
      const json = JSON.parse(raw)
      const cards: LocalCard[] = Array.isArray(json) ? json : json.data ?? []
      result.push(...cards)
    } catch (err) {
      console.error(`Failed to read card file ${filePath}:`, err)
    }
  }

  allCardsCache = result
  console.log(`Loaded ${result.length} cards from local data (${files.length} files)`)
  return result
}

function buildId(setId: string, number: string) {
  return `${setId.toLowerCase()}-${number.toLowerCase()}`
}

async function mapLiveSetCodeToInternalId(liveSetCode: string) {
  const map = await loadSetCodeMap()
  const lc = liveSetCode.toLowerCase()

  // --- manual aliases for codes that aren't in sets/en.json yet ---
  if (lc === "mee") {
    // "Mega Energies" -> reuse Scarlet & Violet Energies images
    return "sve"
  }
  // ----------------------------------------------------------------

  // If we know this ptcgoCode (PFL, PAF, TEF, etc.), return the dataset id (me2, sv4pt5, sv5, ...)
  return map[lc] ?? lc
}

async function getCardFromLocalId(rawId: string) {
  const [liveSetCode, cardNumber] = rawId.split("-")
  if (!liveSetCode || !cardNumber) return null

  const canonicalSetId = await mapLiveSetCodeToInternalId(liveSetCode)

  const candidateIds = [
    buildId(canonicalSetId, cardNumber), // e.g. me2-7 for PFL-7
    buildId(liveSetCode, cardNumber),    // e.g. pfl-7 just in case
  ]

  const cards = await loadAllCards()

  // Try match by card.id
  let match =
    cards.find(
      (c) => c.id && candidateIds.includes(c.id.toLowerCase())
    ) ??
    // Then by set.id + number
    cards.find((c) => {
      const setId = c.set?.id
      const num = c.number
      if (!setId || !num) return false
      const cid = buildId(setId, num)
      return candidateIds.includes(cid)
    })

  if (!match) {
    console.warn(`No local card found for ${rawId}`)
    return null
  }

  const image =
    match.images?.small ??
    (match as any).imageUrl ??
    (match as any).imageUrlHiRes ??
    undefined

  const setName = match.set?.name ?? liveSetCode.toUpperCase()

  return {
    id: rawId,
    name: match.name ?? `${liveSetCode.toUpperCase()} ${cardNumber}`,
    image,
    set: setName,
    number: match.number ?? cardNumber,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []

    if (!ids.length) {
      return NextResponse.json({ cards: [] }, { status: 200 })
    }

    const cards = await Promise.all(
      ids.map(async (rawId) => {
        const card = await getCardFromLocalId(rawId)

        if (card) return card

        // Fallback: text-only placeholder if we can't find an image
        const [setCode, num] = rawId.split("-")
        return {
          id: rawId,
          name: `Card ${rawId.toUpperCase()}`,
          image: undefined,
          set: setCode?.toUpperCase() ?? "Unknown Set",
          number: num ?? "??",
        }
      })
    )

    return NextResponse.json({ cards }, { status: 200 })
  } catch (err) {
    console.error("Error in /api/cards:", err)
    return NextResponse.json(
      { error: "Failed to load cards" },
      { status: 500 }
    )
  }
}
