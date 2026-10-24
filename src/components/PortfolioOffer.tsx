"use client";

import { useEffect, useState } from "react";
import { Clock3, Tag } from "lucide-react";
import type { PortfolioProject } from "@/lib/types";
import { formatPKR } from "@/lib/constants";
import { getPortfolioOffer } from "@/lib/portfolio-offers";

export default function PortfolioOffer({ project }: { project: PortfolioProject }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const offer = getPortfolioOffer(project, now);
  if (!offer) return null;

  const remainingSeconds = Math.max(0, Math.floor((offer.endsAt - now) / 1000));
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const countdown = [
    days > 0 ? `${days}d` : "",
    `${String(hours).padStart(2, "0")}h`,
    `${String(minutes).padStart(2, "0")}m`,
    `${String(seconds).padStart(2, "0")}s`,
  ].filter(Boolean).join(" ");

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E31E36] px-2.5 py-1 text-[10px] font-extrabold uppercase text-white">
        <Tag className="h-3 w-3" /> {offer.tag}
      </span>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="text-lg font-black text-[#E31E36]">{formatPKR(offer.offerPrice)}</strong>
        <span className="text-xs text-gray-500 line-through">{formatPKR(offer.originalPrice)}</span>
        <span className="text-[10px] font-bold text-rose-700">{offer.discountPercent}% off</span>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800" aria-live="off">
        <Clock3 className="h-3 w-3" /> Ends in {countdown}
      </span>
    </div>
  );
}
