module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/app/api/cards/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/cards/route.ts
__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
const runtime = "nodejs";
const CARDS_BASE_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), "TCGData", "pokemon-tcg-data-master", "cards", "en");
const SETS_FILE_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), "TCGData", "pokemon-tcg-data-master", "sets", "en.json");
// Caches so we don't re-read from disk every request
let allCardsCache = null;
let setCodeMapCache = null;
async function loadSetCodeMap() {
    if (setCodeMapCache) return setCodeMapCache;
    try {
        const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(SETS_FILE_PATH, "utf8");
        const sets = JSON.parse(raw);
        const map = {};
        for (const set of sets){
            const id = set.id;
            const code = set.ptcgoCode;
            if (!id || !code) continue;
            // ptcgoCode (what Live exports use) -> internal set id
            map[code.toLowerCase()] = id.toLowerCase();
        }
        setCodeMapCache = map;
        console.log(`Loaded ${Object.keys(map).length} set code mappings from sets/en.json`);
        return map;
    } catch (err) {
        console.error("Failed to load set code map from sets/en.json:", err);
        // Fallback: empty map, so we just use the raw set code
        setCodeMapCache = {};
        return setCodeMapCache;
    }
}
async function loadAllCards() {
    if (allCardsCache) return allCardsCache;
    const files = (await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readdir(CARDS_BASE_PATH)).filter((f)=>f.endsWith(".json"));
    const result = [];
    for (const file of files){
        const filePath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(CARDS_BASE_PATH, file);
        try {
            const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(filePath, "utf8");
            const json = JSON.parse(raw);
            const cards = Array.isArray(json) ? json : json.data ?? [];
            result.push(...cards);
        } catch (err) {
            console.error(`Failed to read card file ${filePath}:`, err);
        }
    }
    allCardsCache = result;
    console.log(`Loaded ${result.length} cards from local data (${files.length} files)`);
    return result;
}
function buildId(setId, number) {
    return `${setId.toLowerCase()}-${number.toLowerCase()}`;
}
async function mapLiveSetCodeToInternalId(liveSetCode) {
    const map = await loadSetCodeMap();
    const lc = liveSetCode.toLowerCase();
    // --- manual aliases for codes that aren't in sets/en.json yet ---
    if (lc === "mee") {
        // "Mega Energies" -> reuse Scarlet & Violet Energies images
        return "sve";
    }
    // ----------------------------------------------------------------
    // If we know this ptcgoCode (PFL, PAF, TEF, etc.), return the dataset id (me2, sv4pt5, sv5, ...)
    return map[lc] ?? lc;
}
async function getCardFromLocalId(rawId) {
    const [liveSetCode, cardNumber] = rawId.split("-");
    if (!liveSetCode || !cardNumber) return null;
    const canonicalSetId = await mapLiveSetCodeToInternalId(liveSetCode);
    const candidateIds = [
        buildId(canonicalSetId, cardNumber),
        buildId(liveSetCode, cardNumber)
    ];
    const cards = await loadAllCards();
    // Try match by card.id
    let match = cards.find((c)=>c.id && candidateIds.includes(c.id.toLowerCase())) ?? // Then by set.id + number
    cards.find((c)=>{
        const setId = c.set?.id;
        const num = c.number;
        if (!setId || !num) return false;
        const cid = buildId(setId, num);
        return candidateIds.includes(cid);
    });
    if (!match) {
        console.warn(`No local card found for ${rawId}`);
        return null;
    }
    const image = match.images?.small ?? match.imageUrl ?? match.imageUrlHiRes ?? undefined;
    const setName = match.set?.name ?? liveSetCode.toUpperCase();
    return {
        id: rawId,
        name: match.name ?? `${liveSetCode.toUpperCase()} ${cardNumber}`,
        image,
        set: setName,
        number: match.number ?? cardNumber
    };
}
async function POST(req) {
    try {
        const body = await req.json();
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                cards: []
            }, {
                status: 200
            });
        }
        const cards = await Promise.all(ids.map(async (rawId)=>{
            const card = await getCardFromLocalId(rawId);
            if (card) return card;
            // Fallback: text-only placeholder if we can't find an image
            const [setCode, num] = rawId.split("-");
            return {
                id: rawId,
                name: `Card ${rawId.toUpperCase()}`,
                image: undefined,
                set: setCode?.toUpperCase() ?? "Unknown Set",
                number: num ?? "??"
            };
        }));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            cards
        }, {
            status: 200
        });
    } catch (err) {
        console.error("Error in /api/cards:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to load cards"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cfc699ee._.js.map