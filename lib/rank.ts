// lib/rank.ts
export type TierId = "pokeball" | "greatball" | "ultraball" | "masterball";

export interface RankState {
  tier: TierId;
  /** 0–100 for Poké/Great/Ultra; ignored for Master Ball */
  progress: number;
  /** Only used in Master Ball tier */
  elo: number;
}

export const TIER_ORDER: TierId[] = [
  "pokeball",
  "greatball",
  "ultraball",
  "masterball",
];

// lib/rank.ts

const TIER_CONFIG: Record<
  "pokeball" | "greatball" | "ultraball",
  { expected: number; scale: number }
> = {
  // Much easier to climb out of Poké Ball
  pokeball:  { expected: 0.15, scale: 80 },
  greatball: { expected: 0.35, scale: 70 },
  ultraball: { expected: 0.55, scale: 60 },
};


const MASTER_EXPECTED = 0.8;
const MASTER_K = 40;

export const initialRankState: RankState = {
  tier: "pokeball",
  progress: 0,
  elo: 1200,
};

export function updateRank(
  current: RankState,
  overallScore: number,
  maxScore: number,
): RankState {
  const normalized = Math.max(0, Math.min(1, overallScore / maxScore));

  // Master Ball → Elo mode only
  if (current.tier === "masterball") {
    const deltaElo = MASTER_K * (normalized - MASTER_EXPECTED);
    return {
      ...current,
      elo: Math.max(0, Math.round(current.elo + deltaElo)),
      progress: 0,
    };
  }

  // Progress-bar tiers
  const { expected, scale } = TIER_CONFIG[current.tier];
  const delta = (normalized - expected) * scale;
  let nextProgress = current.progress + delta;
  let nextTier = current.tier;

  const idx = TIER_ORDER.indexOf(current.tier);

  // Promotion
  if (nextProgress >= 100) {
    const promotedTier = TIER_ORDER[idx + 1] ?? "masterball";

    if (promotedTier === "masterball") {
      const overflow = nextProgress - 100;
      const bonus = Math.max(0, overflow) * 2; // tiny Elo head start
      return {
        tier: "masterball",
        progress: 0,
        elo: Math.round(1200 + bonus),
      };
    } else {
      nextTier = promotedTier;
      // keep some overflow, but cap at 40% in new tier
      nextProgress = Math.min(40, nextProgress - 100);
    }
  }

  // Demotion (can’t go below Poké Ball)
  if (nextProgress <= 0 && current.tier !== "pokeball") {
    const demotedTier = TIER_ORDER[idx - 1] ?? "pokeball";
    nextTier = demotedTier;
    // fall back to 80% of the lower tier so it’s easy to bounce back
    nextProgress = 80;
  }

  nextProgress = Math.max(0, Math.min(100, nextProgress));

  return {
    ...current,
    tier: nextTier,
    progress: Math.round(nextProgress),
  };
}
