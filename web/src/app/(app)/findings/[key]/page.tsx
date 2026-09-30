import { FindingDetail } from '@/components/findings/FindingDetail';
import { decodeSegment } from '@/lib/routes';

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <FindingDetail findingKey={decodeSegment(key)} />;
}
