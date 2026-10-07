import { FindingDetail } from '@/components/findings/FindingDetail';
import { en } from '@/i18n/en';
import { keyFindings } from '@/lib/findings';
import { decodeSegment, routeKey } from '@/lib/routes';
import { sampleResult } from '@/lib/sample';

export const dynamicParams = false;

export const metadata = {
  title: en.meta.pages.finding.title,
  description: en.meta.pages.finding.description,
};

export function generateStaticParams() {
  return keyFindings(sampleResult.findings).map(({ key }) => ({ key: routeKey(key) }));
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <FindingDetail findingKey={decodeSegment(key)} />;
}
