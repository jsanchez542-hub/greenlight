import { FindingDetail } from '@/components/findings/FindingDetail';
import { demoPageMetadata } from '@/lib/demo-metadata';
import { keyFindings } from '@/lib/findings';
import { decodeSegment, routeKey } from '@/lib/routes';
import { sampleResult } from '@/lib/sample';

interface Props {
  params: Promise<{ key: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return keyFindings(sampleResult.findings).map(({ key }) => ({ key: routeKey(key) }));
}

export async function generateMetadata({ params }: Props) {
  const { key } = await params;
  return demoPageMetadata(`/findings/${key}/`);
}

export default async function Page({ params }: Props) {
  const { key } = await params;
  return <FindingDetail findingKey={decodeSegment(key)} />;
}
