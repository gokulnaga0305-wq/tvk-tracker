import DistrictDetail from '@/components/DistrictDetail';

export default async function DistrictPage({ params }: { params: Promise<{ district: string }> }) {
  const { district } = await params;
  return <DistrictDetail district={decodeURIComponent(district)} />;
}
