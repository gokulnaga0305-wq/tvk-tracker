import type { Metadata } from "next";
import { Geist, Noto_Sans_Tamil } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TVK Files — Tamil Nadu Government Tracker",
  description: "Real-time fact-checking and accountability tracker for the TVK government in Tamil Nadu",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const initial: Locale = localeCookie === "ta" ? "ta" : "en";

  return (
    <html lang={initial} className={`${geistSans.variable} ${notoTamil.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-[#0f0f0f] text-[#f0f0f0]" style={{ fontFamily: initial === "ta" ? "var(--font-noto-tamil), var(--font-geist-sans), sans-serif" : "var(--font-geist-sans), sans-serif" }}>
        <LocaleProvider initial={initial}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen overflow-auto">
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
