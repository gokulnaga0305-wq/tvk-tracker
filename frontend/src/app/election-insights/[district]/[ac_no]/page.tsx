import BoothDetail from '@/components/BoothDetail';

export default async function ACBoothPage({ params }: { params: Promise<{ district: string; ac_no: string }> }) {
  const { district, ac_no } = await params;
  return <BoothDetail acNo={parseInt(ac_no, 10)} district={decodeURIComponent(district)} />;
}
