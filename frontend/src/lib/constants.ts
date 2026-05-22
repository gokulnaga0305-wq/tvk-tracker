export const GOVT_START_DATE = new Date('2026-05-11');

export const CATEGORY_LABELS: Record<string, string> = {
  corruption: 'Corruption',
  murders: 'Murders',
  sexual_assault: 'Sexual Assaults',
  crimes_women_kids: 'Crimes vs Women & Kids',
  censorship: 'Censorship',
  credit_stealing: 'Credit Stealing',
  governance: 'Governance',
  police_excess: 'Police Excess',
  drug_menace: 'Drug Menace',
  media_blackout: 'Media Blackout',
  tenders: 'Tenders / Scams',
  fake_news: 'Fake News',
  alcohol_menace: 'Alcohol Menace',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<string, string> = {
  corruption: 'text-yellow-400 border-yellow-400',
  murders: 'text-red-500 border-red-500',
  sexual_assault: 'text-red-400 border-red-400',
  crimes_women_kids: 'text-orange-400 border-orange-400',
  censorship: 'text-purple-400 border-purple-400',
  credit_stealing: 'text-blue-400 border-blue-400',
  governance: 'text-gray-400 border-gray-400',
  police_excess: 'text-red-300 border-red-300',
  drug_menace: 'text-green-400 border-green-400',
  media_blackout: 'text-purple-300 border-purple-300',
  tenders: 'text-yellow-300 border-yellow-300',
  fake_news: 'text-pink-400 border-pink-400',
  alcohol_menace: 'text-amber-400 border-amber-400',
  other: 'text-gray-500 border-gray-500',
};

export const PROMISE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-300',
  kept: 'bg-green-900 text-green-300',
  broken: 'bg-red-900 text-red-300',
  partial: 'bg-yellow-900 text-yellow-300',
};
