import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const dataDir = path.join(rootDir, "data", "pokemon-tcg")
const cardsDir = path.join(dataDir, "cards", "en")
const setsFile = path.join(dataDir, "sets", "en.json")
const sourceFile = path.join(dataDir, "source.json")
const generatedDir = path.join(rootDir, "data", "generated")
const outputFile = path.join(generatedDir, "card-index.json")

const manualSetAliases = {
  // "Mega Energies" exports can use MEE, but the local data has SVE energy art.
  mee: "sve",
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase()
}

function buildId(setId, number) {
  return `${normalize(setId)}-${normalize(number)}`
}

function toIndexedCard(card, setNameById) {
  const setId = normalize(card.set?.id) || normalize(card.id).split("-")[0]
  const setName = card.set?.name ?? setNameById.get(setId) ?? setId.toUpperCase()

  return {
    id: normalize(card.id),
    name: card.name ?? "Unknown Card",
    image: card.images?.small ?? card.imageUrl ?? card.imageUrlHiRes ?? card.images?.large,
    set: setName,
    number: card.number ?? "",
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

async function main() {
  const files = (await readdir(cardsDir))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))

  if (!files.length) {
    throw new Error(`No card JSON files found in ${cardsDir}`)
  }

  const sets = await readJson(setsFile)
  if (!Array.isArray(sets)) {
    throw new Error(`${setsFile} must contain a set array`)
  }

  const setCodeToId = new Map()
  const setNameById = new Map()
  const setNameByCode = new Map()
  for (const set of sets) {
    const id = normalize(set.id)
    const ptcgoCode = normalize(set.ptcgoCode)
    if (id) setCodeToId.set(id, id)
    if (id && set.name) {
      setNameById.set(id, set.name)
      setNameByCode.set(id, set.name)
    }
    if (ptcgoCode) {
      setCodeToId.set(ptcgoCode, id)
      if (set.name) setNameByCode.set(ptcgoCode, set.name)
    }
  }
  for (const [code, id] of Object.entries(manualSetAliases)) {
    setCodeToId.set(code, id)
    const setName = setNameById.get(id)
    if (setName) setNameByCode.set(code, setName)
  }

  const cardsById = new Map()
  let cardCount = 0

  for (const file of files) {
    const json = await readJson(path.join(cardsDir, file))
    const cards = Array.isArray(json) ? json : json.data ?? []

    for (const card of cards) {
      const indexed = toIndexedCard(card, setNameById)
      if (!indexed.id) continue

      cardCount += 1
      cardsById.set(indexed.id, indexed)

      const setId = card.set?.id
      const number = card.number
      if (setId && number) {
        cardsById.set(buildId(setId, number), indexed)
      }
    }
  }

  let source = null
  try {
    source = await readJson(sourceFile)
  } catch {
    source = null
  }

  const index = {
    sourceCommit: source?.sourceCommit ?? null,
    generatedAt: new Date().toISOString(),
    cardFileCount: files.length,
    cardCount,
    setCodeToId: Object.fromEntries([...setCodeToId.entries()].sort(([a], [b]) => a.localeCompare(b))),
    setNameById: Object.fromEntries([...setNameById.entries()].sort(([a], [b]) => a.localeCompare(b))),
    setNameByCode: Object.fromEntries([...setNameByCode.entries()].sort(([a], [b]) => a.localeCompare(b))),
    cardsById: Object.fromEntries([...cardsById.entries()].sort(([a], [b]) => a.localeCompare(b))),
  }

  await mkdir(generatedDir, { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(index)}\n`)

  console.log(
    `Built card index with ${cardsById.size} lookup keys for ${cardCount} cards from ${files.length} files`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
