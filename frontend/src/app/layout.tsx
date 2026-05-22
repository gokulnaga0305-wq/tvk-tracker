import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TVK Files — Tamil Nadu Government Tracker",
  description: "Real-time fact-checking and accountability tracker for the TVK government in Tamil Nadu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-[#0f0f0f] text-[#f0f0f0]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
