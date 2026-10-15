"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackVisitorEvent } from "@/lib/visitor-tracking";

export default function VisitorAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    trackVisitorEvent("visitor").catch((error) => {
      console.error("Could not record today's visitor count", error);
    });
    if (pathname === "/calculator") {
      trackVisitorEvent("calculator").catch((error) => {
        console.error("Could not record today's budget calculator user count", error);
      });
    }
  }, [pathname]);

  return null;
}
