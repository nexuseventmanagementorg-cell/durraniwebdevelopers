import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Workforce Role Profiles & Capability Showcase | Durrani Web Developers",
  description:
    "Explore 50 illustrative Durrani Web Developers role profiles and the limited admin-triggered Requirements Analyst capability. Profiles are not 50 operational AI agents.",
  keywords: [
    "DWD AI Agency Workforce",
    "Durrani Web Developers Team",
    "AI Software Agency",
    "Human Gated AI Development",
    "Web Development Specialists",
    "Next.js Development Agency",
  ],
};

export default function WorkforceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
