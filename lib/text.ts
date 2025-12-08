// lib/text.ts

// "𝘦𝘹" written with Unicode escapes so the file can stay ASCII-only
export const EX_FANCY = "\uD835\uDE26\uD835\uDE39"; // 𝘦𝘹

// Replace standalone "ex" (case-insensitive) with fancy 𝘦𝘹
export function stylizeEx(text: string): string {
  return text.replace(/\bex\b/gi, EX_FANCY);
}
