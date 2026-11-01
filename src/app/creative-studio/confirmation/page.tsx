import type { Metadata } from "next";
import CreativeStudioConfirmation from "./confirmation-client";

export const metadata: Metadata = {
  title: "Creative Project Inquiry | Durrani Web Developers",
  robots: { index: false, follow: false },
};

export default function CreativeStudioConfirmationPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return <CreativeStudioConfirmation inquiryId={searchParams.id || ""} />;
}
