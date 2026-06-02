import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const indexFile = path.join(rootDir, "data", "generated", "card-index.json")

function normalize(value) {
  return String(value ?? "").trim().toLowerCase()
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

const raw = await readFile(indexFile, "utf8")
const index = JSON.parse(raw)

const requiredCodes = ["PAF", "PFL", "MEG", "ASC", "POR", "CRI"]
const requiredCards = ["PAF-7", "PFL-11", "MEG-125", "MEE-2"]

for (const code of requiredCodes) {
  const mapped = index.setCodeToId?.[normalize(code)]
  if (!mapped) {
    fail(`Missing set code mapping for ${code}`)
    continue
  }

  const prefix = `${mapped}-`
  const hasCardsForSet = Object.keys(index.cardsById ?? {}).some((key) => key.startsWith(prefix))
  if (!hasCardsForSet) {
    fail(`Set code ${code} maps to ${mapped}, but no indexed cards were found for that set`)
  }
}

for (const rawId of requiredCards) {
  const [code, number] = normalize(rawId).split("-")
  const setId = index.setCodeToId?.[code] ?? code
  const card = index.cardsById?.[`${setId}-${number}`]
  if (!card?.name) {
    fail(`Could not resolve ${rawId} through generated index`)
  }
}

if (!process.exitCode) {
  console.log(
    `Card index smoke check passed for ${requiredCodes.length} set codes and ${requiredCards.length} card ids`,
  )
}
