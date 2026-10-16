import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import VisitorAnalytics from "@/components/VisitorAnalytics";

export const metadata: Metadata = {
  title: "Durrani Web Developers | Custom Web Applications & Enterprise Software",
  description:
    "Professional web development business creating custom web applications, e-commerce stores, restaurant ordering systems, SaaS projects, and business management software. Pakistan starting rates in PKR; international estimates in local currencies.",
  keywords: [
    "Durrani Web Developers",
    "Web Application Development Pakistan",
    "Restaurant Ordering System",
    "E-commerce Store Development",
    "SaaS Development",
    "Custom Software Lahore Karachi Islamabad",
    "Next.js Developers Pakistan",
  ],
  authors: [{ name: "Durrani Web Developers" }],
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#101216] selection:bg-[#E31E36] selection:text-white">
        <CurrencyProvider>
          <VisitorAnalytics />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFloat />
        </CurrencyProvider>
      </body>
    </html>
  );
}
