"use client";

import { useEffect } from "react";
import { initDeepLinks } from "@/lib/native/deepLink";

/**
 * Mounts app-wide (including logged-out routes, since reset/confirm links open
 * while signed out) to route Universal Links into the in-app webview. No-op on
 * web. Renders nothing.
 */
export default function DeepLinkHandler() {
  useEffect(() => {
    void initDeepLinks();
  }, []);
  return null;
}
