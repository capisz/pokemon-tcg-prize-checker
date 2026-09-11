import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opt in only for the local container; preserve the hosted build behavior.
  ...(process.env.PRIZECHECK_STANDALONE === "true" ? { output: "standalone" } : {}),
  env: {
    // Production uses the verified public Firebase web app; previews stay disabled.
    NEXT_PUBLIC_FIREBASE_ACCOUNTS_DISABLED: process.env.VERCEL_ENV === "preview" ? "true" : "false",
    ...(process.env.VERCEL_ENV === "production" ? {
      "NEXT_PUBLIC_FIREBASE_API_KEY": "AIzaSyC_HSVvBzVZklYsoIalUGUjc8XtzwTYGUE",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "prizecheck-f33ad.firebaseapp.com",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "prizecheck-f33ad",
      "NEXT_PUBLIC_FIREBASE_APP_ID": "1:16607788218:web:c85a792af094cc1f6e9683",
      "NEXT_PUBLIC_FIREBASE_USE_EMULATORS": "false"
} : {}),
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
