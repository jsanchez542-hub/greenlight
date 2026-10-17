import { WorkflowDetail } from '@/components/workflows/WorkflowDetail';
import { demoPageMetadata } from '@/lib/demo-metadata';
import { decodeSegment } from '@/lib/routes';
import { sampleResult } from '@/lib/sample';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return sampleResult.workflows.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return demoPageMetadata(`/workflows/${id}/`);
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <WorkflowDetail workflowId={decodeSegment(id)} />;
}
