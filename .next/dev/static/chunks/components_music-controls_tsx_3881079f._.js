(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/music-controls.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MusicControls",
    ()=>MusicControls
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const INITIAL_VOLUME = 0.4;
function MusicControls() {
    _s();
    const audioRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [isPlaying, setIsPlaying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [volume, setVolume] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(INITIAL_VOLUME);
    // Try to autoplay once on mount,
    // and fall back to "play on first click anywhere"
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MusicControls.useEffect": ()=>{
            const audio = audioRef.current;
            if (!audio) return;
            audio.volume = INITIAL_VOLUME;
            const tryPlay = {
                "MusicControls.useEffect.tryPlay": async ()=>{
                    try {
                        await audio.play();
                        setIsPlaying(true);
                    } catch  {
                    // Autoplay blocked — we'll start on first user interaction
                    // (browser policy thing)
                    }
                }
            }["MusicControls.useEffect.tryPlay"];
            // Try immediately
            tryPlay();
            // Then try again on first click anywhere on the page
            const handleFirstInteraction = {
                "MusicControls.useEffect.handleFirstInteraction": ()=>{
                    tryPlay();
                    document.removeEventListener("click", handleFirstInteraction);
                }
            }["MusicControls.useEffect.handleFirstInteraction"];
            document.addEventListener("click", handleFirstInteraction);
            return ({
                "MusicControls.useEffect": ()=>{
                    document.removeEventListener("click", handleFirstInteraction);
                }
            })["MusicControls.useEffect"];
        }
    }["MusicControls.useEffect"], []);
    const togglePlay = async ()=>{
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                audio.volume = volume;
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Could not start audio", err);
            }
        }
    };
    const handleVolumeChange = (e)=>{
        const value = Number(e.target.value);
        setVolume(value);
        if (audioRef.current) {
            audioRef.current.volume = value;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-2 text-xs text-slate-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: togglePlay,
                className: "rounded-full bg-slate-800/60 px-3 py-1 hover:bg-slate-700/80",
                children: isPlaying ? "Pause Music" : "Play Music"
            }, void 0, false, {
                fileName: "[project]/components/music-controls.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[10px] text-slate-400",
                        children: "Vol"
                    }, void 0, false, {
                        fileName: "[project]/components/music-controls.tsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "range",
                        min: "0",
                        max: "1",
                        step: "0.01",
                        value: volume,
                        onChange: handleVolumeChange,
                        className: "h-1 w-20 cursor-pointer"
                    }, void 0, false, {
                        fileName: "[project]/components/music-controls.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/music-controls.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
                ref: audioRef,
                src: "/audio/bg-music.mp3",
                loop: true
            }, void 0, false, {
                fileName: "[project]/components/music-controls.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/music-controls.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
_s(MusicControls, "h78U7wMcKqvyL97YRnawrpzk+Is=");
_c = MusicControls;
var _c;
__turbopack_context__.k.register(_c, "MusicControls");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_music-controls_tsx_3881079f._.js.map