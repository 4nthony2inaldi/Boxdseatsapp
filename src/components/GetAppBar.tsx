"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/native/photoScan";

const APP_STORE_URL = "https://apps.apple.com/app/id6781299327";
// Legal/support pages should stay clean — no app pitch.
const HIDE_ON = ["/privacy", "/terms", "/support"];

/**
 * Pinned top bar on public share landings (fan passports, shared profiles and
 * events) nudging web visitors to the app. iOS Safari already gets the native
 * Smart App Banner; this covers everywhere that doesn't (Android, and the
 * in-app browsers links usually open in — Instagram, iMessage, etc.). Hidden in
 * the native app itself and on legal pages.
 */
export default function GetAppBar() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNativeApp()) setShow(true);
  }, []);

  if (!show || HIDE_ON.includes(pathname)) return null;

  return (
    <div className="bg-accent text-bg">
      <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-2">
        <span className="flex-1 min-w-0 text-sm font-medium truncate">
          Log every game you attend on BoxdSeats
        </span>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded-md bg-bg/15 px-3 py-1 text-xs font-display tracking-wide uppercase active:opacity-70 transition-opacity"
        >
          Get the app
        </a>
      </div>
    </div>
  );
}
