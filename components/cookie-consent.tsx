"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const COOKIE_NAME = "pcd_cookie_consent"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function getConsentCookie() {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split("; ")
  const match = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))

  return match?.split("=")[1] ?? null
}

function setConsentCookie(value: "accepted" | "declined") {
  document.cookie = [
    `${COOKIE_NAME}=${value}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ].join("; ")
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(!getConsentCookie())
  }, [])

  const saveChoice = (value: "accepted" | "declined") => {
    setConsentCookie(value)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-lg border border-emerald-300/40 bg-slate-950/95 p-3 text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur md:bottom-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-relaxed text-slate-200">
          PrizeCheck uses cookies and local storage to remember your choices and app progress.
          See the{" "}
          <Link href="/privacy" className="text-emerald-200 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => saveChoice("declined")}
            className="rounded-md border border-slate-600/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-800"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => saveChoice("accepted")}
            className="rounded-md bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-200"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
