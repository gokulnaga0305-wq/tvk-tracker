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

const SITE_URL = "https://tvk-tracker.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TVK Files — Tamil Nadu Government Tracker",
    template: "%s · TVK Files",
  },
  description:
    "Real-time fact-checking and accountability tracker for the TVK government in Tamil Nadu. " +
    "Cross-referenced with DMK government archive (2021-2026) — every credit-steal claim gets receipts.",
  keywords: [
    "TVK", "Tamilaga Vettri Kazhagam", "CM Vijay", "Tamil Nadu government",
    "DMK", "fact check", "accountability", "credit stealing", "TVK Files",
    "Stalin", "Kalaignar",
  ],
  authors: [{ name: "TVK Files" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: "ta_IN",
    url: SITE_URL,
    siteName: "TVK Files",
    title: "TVK Files — Tamil Nadu Government Tracker",
    description:
      "Real-time fact-checking and accountability tracker for the TVK government in Tamil Nadu",
  },
  twitter: {
    card: "summary_large_image",
    title: "TVK Files — Tamil Nadu Government Tracker",
    description:
      "Real-time fact-checking and accountability tracker for the TVK government in Tamil Nadu",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "en-IN": SITE_URL, "ta-IN": SITE_URL },
  },
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
