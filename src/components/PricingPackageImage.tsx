"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Maximize2, X } from "lucide-react";

export default function PricingPackageImage({
  src,
  alt,
  title,
  width,
  height,
  sizes,
}: {
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  sizes: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View full details for ${title}`}
        className="group relative block w-full cursor-zoom-in text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#E31E36] focus-visible:ring-inset"
      >
        <div className="relative aspect-[3/2] w-full bg-white">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-contain transition-transform duration-200 group-hover:scale-[1.015]"
          />
        </div>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-[#101216]/90 px-3 py-2 text-xs font-bold text-white shadow-lg">
          <Maximize2 className="h-3.5 w-3.5" />
          View full details
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} package details`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="relative my-auto w-full max-w-6xl rounded-xl bg-white p-2 shadow-2xl sm:p-4">
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-3 rounded-lg bg-white/95 p-2 backdrop-blur sm:mb-3">
              <h2 className="text-sm font-extrabold text-[#101216] sm:text-base">
                {title} — complete features &amp; pricing
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-100 sm:text-xs"
                >
                  Open original <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close package details"
                  className="rounded-lg bg-[#101216] p-2 text-white hover:bg-[#E31E36]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="mx-auto h-auto w-full"
            />
            <p className="py-2 text-center text-[11px] text-gray-500">
              Scroll to read the full flyer. Use “Open original” for browser zoom.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
