import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const dataDir = path.join(rootDir, "data", "pokemon-tcg")
const cardsDir = path.join(dataDir, "cards", "en")
const setsDir = path.join(dataDir, "sets")
const sourceFile = path.join(dataDir, "source.json")

const repoApi = "https://api.github.com/repos/PokemonTCG/pokemon-tcg-data"
const ref = process.env.POKEMON_TCG_DATA_REF ?? "master"
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "pokemon-tcg-prize-checker-data-sync",
}

async function fetchJson(url) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function removeExistingJsonFiles(dir) {
  await mkdir(dir, { recursive: true })
  const files = await readdir(dir)
  await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => rm(path.join(dir, file))),
  )
}

async function downloadWithConcurrency(items, limit, worker) {
  let nextIndex = 0
  const workers = Array.from({ length: limit }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex]
      nextIndex += 1
      await worker(item)
    }
  })
  await Promise.all(workers)
}

async function main() {
  await mkdir(cardsDir, { recursive: true })
  await mkdir(setsDir, { recursive: true })

  const commit = await fetchJson(`${repoApi}/commits/${encodeURIComponent(ref)}`)
  const sourceCommit = commit.sha

  const cardContents = await fetchJson(
    `${repoApi}/contents/cards/en?ref=${encodeURIComponent(ref)}`,
  )
  const cardFiles = cardContents
    .filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (!cardFiles.length) {
    throw new Error("No card JSON files were found in upstream cards/en")
  }

  await removeExistingJsonFiles(cardsDir)

  await downloadWithConcurrency(cardFiles, 8, async (entry) => {
    const raw = await fetchText(entry.download_url)
    JSON.parse(raw)
    await writeFile(path.join(cardsDir, entry.name), raw.endsWith("\n") ? raw : `${raw}\n`)
  })

  const setsRaw = await fetchText(
    `https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/${encodeURIComponent(
      ref,
    )}/sets/en.json`,
  )
  const sets = JSON.parse(setsRaw)
  if (!Array.isArray(sets) || !sets.length) {
    throw new Error("Downloaded sets/en.json did not contain a set array")
  }
  await writeFile(path.join(setsDir, "en.json"), setsRaw.endsWith("\n") ? setsRaw : `${setsRaw}\n`)

  const source = {
    repository: "PokemonTCG/pokemon-tcg-data",
    ref,
    sourceCommit,
    syncedAt: new Date().toISOString(),
    cardFileCount: cardFiles.length,
    setCount: sets.length,
  }
  await writeFile(sourceFile, `${JSON.stringify(source, null, 2)}\n`)

  const requiredFiles = ["me2pt5.json", "me3.json", "me4.json"]
  const missingRequiredFiles = requiredFiles.filter(
    (file) => !cardFiles.some((entry) => entry.name === file),
  )
  if (missingRequiredFiles.length) {
    throw new Error(`Expected current card files missing upstream: ${missingRequiredFiles.join(", ")}`)
  }

  console.log(
    `Synced ${cardFiles.length} card files and ${sets.length} sets from ${sourceCommit.slice(0, 7)}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
