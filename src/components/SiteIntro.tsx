"use client";

import { useEffect, useRef, useState } from "react";

export default function SiteIntro() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const video = videoRef.current;
    if (video) {
      void video.play().catch(() => setVisible(false));
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Durrani Web Developers introduction"
      className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        preload="auto"
        onEnded={() => setVisible(false)}
        onError={() => setVisible(false)}
        className="h-full w-full object-contain"
      >
        <source src="/logoanimation2.mp4" type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-4 top-4 rounded-full border border-white/40 bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm sm:right-8 sm:top-8"
      >
        Skip intro
      </button>
    </div>
  );
}
