import type { Metadata } from "next";
import CreativeStudioClient from "./studio-client";

export const metadata: Metadata = {
  title: "AI Creative Studio | Durrani Web Developers",
  description:
    "Plan an AI-powered video, image, animation, or prototype project and request a transparent, reviewed production quotation.",
};

export default function CreativeStudioPage() {
  return <CreativeStudioClient />;
}
