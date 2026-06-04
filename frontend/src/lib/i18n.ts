/**
 * Lightweight bilingual EN/TA translation system.
 *
 * Why no library: next-intl / react-intl is overkill for static UI strings
 * + we want SSR-safe locale switching. Cookie-based, zero deps.
 *
 * Usage in client components:
 *   const { t, locale, setLocale } = useTranslation();
 *   <h1>{t('dashboard.title')}</h1>
 *
 * Usage in server components: import { getTranslator } and pass cookies.
 */

export type Locale = "en" | "ta";

export const STRINGS = {
  // ---- Sidebar / nav ----
  "nav.dashboard":    { en: "Dashboard",        ta: "முகப்பு" },
  "nav.incidents":    { en: "Incidents",        ta: "சம்பவங்கள்" },
  "nav.credit_steals":{ en: "Credit Steals",    ta: "திருட்டு சாதனைகள்" },
  "nav.districts":    { en: "District Mood",    ta: "மாவட்ட மனநிலை" },
  "nav.dmk_timeline": { en: "DMK 2021-2026",    ta: "திமுக 2021-2026" },
  "nav.receipts":     { en: "Receipts",          ta: "ஆதாரங்கள்" },
  "nav.promises":     { en: "Promises",         ta: "வாக்குறுதிகள்" },
  "nav.members":      { en: "Members",          ta: "உறுப்பினர்கள்" },
  "nav.report":       { en: "Citizen Report",   ta: "குடிமக்கள் தகவல்" },
  "nav.methodology":  { en: "Methodology",      ta: "முறையியல்" },
  "nav.corrections":  { en: "Corrections",      ta: "திருத்தங்கள்" },
  "nav.about":        { en: "About",            ta: "எங்களைப் பற்றி" },

  // ---- Top bar / counters ----
  "top.govt_age":     { en: "GOVT AGE",         ta: "ஆட்சி வயது" },
  "top.day":          { en: "DAY",              ta: "நாள்" },
  "top.corruption":   { en: "Corruption",       ta: "ஊழல்" },
  "top.crimes_kids":  { en: "Crimes vs Women & Kids", ta: "பெண்கள் & சிறுவர் குற்றங்கள்" },
  "top.murders":      { en: "Murders (Month)",  ta: "கொலைகள் (மாதம்)" },
  "top.sexual":       { en: "Sexual Assaults (Month)", ta: "பாலியல் வன்கொடுமை (மாதம்)" },
  "top.credit_steals":{ en: "Credit Steals",    ta: "திருட்டு சாதனைகள்" },
  "top.report_issue": { en: "Report Issue?",    ta: "தவறை தெரிவியுங்கள்?" },

  // ---- Dashboard headings ----
  "dash.title":       { en: "Dashboard",        ta: "முகப்பு" },
  "dash.subtitle":    { en: "Track incidents, promises, and governance signals from the TVK government.",
                        ta: "TVK ஆட்சியின் சம்பவங்கள், வாக்குறுதிகள் மற்றும் நிர்வாக சமிக்ஞைகளை கண்காணியுங்கள்." },
  "dash.recent":      { en: "Recent Incidents", ta: "சமீபத்திய சம்பவங்கள்" },
  "dash.view_all":    { en: "View all →",       ta: "அனைத்தையும் பார்க்க →" },
  "dash.dmk_vs_tvk":  { en: "DMK era vs TVK era", ta: "திமுக காலம் vs TVK காலம்" },
  "dash.dmk_pace":    { en: "DMK pace",         ta: "திமுக வேகம்" },
  "dash.under_tvk":   { en: "under TVK",        ta: "TVK கீழ்" },

  // ---- Stat-card labels ----
  "card.corruption":  { en: "CORRUPTION",       ta: "ஊழல்" },
  "card.murders":     { en: "MURDERS",          ta: "கொலைகள்" },
  "card.sexual":      { en: "SEXUAL ASSAULTS",  ta: "பாலியல் வன்கொடுமை" },
  "card.children":    { en: "CRIMES VS CHILDREN", ta: "சிறுவர் குற்றங்கள்" },
  "card.promises":    { en: "PROMISES KEPT",    ta: "நிறைவேற்றிய வாக்குறுதிகள்" },

  // ---- Incidents page ----
  "inc.title":        { en: "All Incidents",    ta: "அனைத்து சம்பவங்கள்" },
  "inc.search":       { en: "Search incidents…", ta: "சம்பவங்களைத் தேடு…" },
  "inc.all_cats":     { en: "All categories",   ta: "அனைத்து வகைகள்" },
  "inc.credit_only":  { en: "Credit Steals only", ta: "திருட்டு சாதனைகள் மட்டும்" },
  "inc.no_results":   { en: "No incidents found", ta: "சம்பவங்கள் இல்லை" },
  "inc.loading":      { en: "Loading…",         ta: "ஏற்றுகிறது…" },
  "inc.sources":      { en: "Sources",          ta: "ஆதாரங்கள்" },
  "inc.original_credit": { en: "Original credit", ta: "உண்மை சாதனை" },
  "inc.retracted":    { en: "Retracted",        ta: "திரும்பப் பெறப்பட்டது" },
  "inc.verified":     { en: "Verified",         ta: "சரிபார்க்கப்பட்டது" },
  "inc.single_source":{ en: "Single source",    ta: "ஒரே ஆதாரம்" },
  "inc.admin_verified":{ en: "Admin verified",  ta: "நிர்வாகி சரிபார்த்தார்" },
  "inc.ai_conf":      { en: "AI conf",          ta: "AI நம்பகம்" },
  "inc.dmk_precedent":{ en: "Originally launched by DMK", ta: "திமுக வெளியிட்ட திட்டம்" },

  // ---- Promises page ----
  "prom.title":       { en: "Promise Tracker",  ta: "வாக்குறுதி கண்காணிப்பு" },
  "prom.subtitle":    { en: "TVK government election manifesto commitments",
                        ta: "TVK ஆட்சியின் தேர்தல் வாக்குறுதிகள்" },
  "prom.kept":        { en: "Kept",             ta: "நிறைவேற்றியது" },
  "prom.broken":      { en: "Broken",           ta: "உடைத்தது" },
  "prom.partial":     { en: "Partial",          ta: "ஓரளவு" },
  "prom.pending":     { en: "Pending",          ta: "காத்திருக்கிறது" },
  "prom.all":         { en: "All",              ta: "அனைத்தும்" },
  "prom.evidence":    { en: "Evidence",         ta: "ஆதாரம்" },

  // ---- Citizen report ----
  "rep.title":        { en: "Citizen Report",   ta: "குடிமக்கள் தகவல்" },
  "rep.subtitle":     { en: "Spotted something? Submit it here. Every report is reviewed before going live.",
                        ta: "ஏதேனும் கண்டீர்களா? இங்கே சமர்ப்பியுங்கள். ஒவ்வொரு தகவலும் வெளியிடப்படுவதற்கு முன் சரிபார்க்கப்படும்." },
  "rep.report_title": { en: "Title",            ta: "தலைப்பு" },
  "rep.description":  { en: "Description",      ta: "விவரம்" },
  "rep.category":     { en: "Category",         ta: "வகை" },
  "rep.location":     { en: "Location",         ta: "இடம்" },
  "rep.date":         { en: "Date",             ta: "தேதி" },
  "rep.your_name":    { en: "Your name (optional)", ta: "உங்கள் பெயர் (விருப்பம்)" },
  "rep.contact":      { en: "Contact (optional, private)", ta: "தொடர்பு (விருப்பம், தனிப்பட்டது)" },
  "rep.images":       { en: "Evidence image URLs", ta: "ஆதார படங்களின் URL" },
  "rep.submit":       { en: "Submit Report",    ta: "தகவல் சமர்ப்பி" },
  "rep.submitting":   { en: "Submitting…",      ta: "சமர்ப்பிக்கிறது…" },
  "rep.required":     { en: "Required",         ta: "கட்டாயம்" },

  // ---- Methodology ----
  "meth.title":       { en: "Methodology",      ta: "முறையியல்" },
  "meth.subtitle":    { en: "How we collect, verify, and publish incidents. Public, auditable, and challengeable.",
                        ta: "சம்பவங்களை எவ்வாறு சேகரிக்கிறோம், சரிபார்க்கிறோம், வெளியிடுகிறோம் என்பதன் முழு விளக்கம்." },

  // ---- Common ----
  "common.tracking_since": { en: "Tracking since May 11, 2026", ta: "மே 11, 2026 முதல் கண்காணிக்கிறோம்" },
  "common.source":    { en: "Source",           ta: "ஆதாரம்" },
  "common.view_all":  { en: "View all",         ta: "அனைத்தையும்" },
  "common.refresh":   { en: "Refresh",          ta: "புதுப்பி" },
  "common.loading":   { en: "Loading…",         ta: "ஏற்றுகிறது…" },

  // ---- Counter-Narrative Card (bilingual receipts card) ----
  "card.cs_banner":   { en: "Credit Steal — Verified Against DMK Archive",
                        ta: "திருட்டு சாதனை — திமுக ஆவணகத்தில் சரிபார்க்கப்பட்டது" },
  "card.tvk_claim":   { en: "TVK Claim",         ta: "தவெக கூற்று" },
  "card.dmk_record":  { en: "DMK Government Record", ta: "திமுக ஆட்சி பதிவு" },
  "card.dmk_launch":  { en: "Originally Launched", ta: "முதலில் தொடங்கப்பட்டது" },
  "card.dmk_era":     { en: "DMK era (2021-2026)", ta: "திமுக காலம் (2021-2026)" },
  "card.receipt":     { en: "Receipt",           ta: "ஆதாரம்" },
  "card.archive_match": { en: "Archive match",   ta: "ஆவண பொருத்தம்" },
  "card.dont_be_fooled": { en: "Don't be fooled.", ta: "ஏமாறாதீர்கள்." },
  "card.dmk_work":    { en: "This was DMK government's work.",
                        ta: "இது திமுக ஆட்சியின் வேலை." },
  "card.proof_count": { en: "more proof",         ta: "மேலும் ஆதாரம்" },

  // ---- Receipts page ----
  "receipts.title":   { en: "DMK Receipts (2021-2026)",
                        ta: "திமுக ஆதாரங்கள் (2021-2026)" },
  "receipts.subtitle": { en: "What the DMK government actually delivered. The reference record for every credit-steal detection.",
                        ta: "திமுக ஆட்சி உண்மையில் என்ன வழங்கியது. ஒவ்வொரு திருட்டு சாதனையையும் கண்டறிய இதுவே ஆதாரம்." },

  // ---- Trending Unverified ----
  "trending.title":   { en: "Breaking — Unconfirmed",
                        ta: "தற்காலிக செய்தி — உறுதிசெய்யப்படவில்லை" },
  "trending.warn":    { en: "Single source. Wait before sharing.",
                        ta: "ஒரே ஆதாரம். பகிர்வதற்கு முன் காத்திருங்கள்." },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale = "en"): string {
  const entry = STRINGS[key];
  if (!entry) return key as string;
  return entry[locale] || entry.en;
}
