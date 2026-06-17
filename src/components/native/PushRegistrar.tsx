"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initPush } from "@/lib/native/push";

/**
 * Mounts in the authed app shell: registers for push if already permitted and
 * wires tap-to-navigate so tapping a notification opens the right screen.
 * No-op on web. Renders nothing.
 */
export default function PushRegistrar() {
  const router = useRouter();
  useEffect(() => {
    void initPush((path) => router.push(path));
  }, [router]);
  return null;
}
