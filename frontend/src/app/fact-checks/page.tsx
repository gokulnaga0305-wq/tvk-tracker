import FactCheckLedger from '@/components/FactCheckLedger';

export const metadata = {
  title: 'Fact-Check Ledger — TVK Files',
  description: 'Every verdict on the dashboard, with its evidence tier and the points we concede.',
};

export default function FactChecksPage() {
  return <FactCheckLedger />;
}
