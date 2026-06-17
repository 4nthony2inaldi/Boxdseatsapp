"use client";

import { useEffect } from "react";
import { initPush } from "@/lib/native/push";

/**
 * Mounts in the authed app shell and registers the device for push on native
 * (no-op on web). Renders nothing.
 */
export default function PushRegistrar() {
  useEffect(() => {
    void initPush();
  }, []);
  return null;
}
