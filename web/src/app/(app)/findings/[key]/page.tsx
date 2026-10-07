import { FindingDetail } from '@/components/findings/FindingDetail';
import { decodeSegment } from '@/lib/routes';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('finding');

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <FindingDetail findingKey={decodeSegment(key)} />;
}
