import { WorkflowDetail } from '@/components/workflows/WorkflowDetail';
import { en } from '@/i18n/en';
import { decodeSegment } from '@/lib/routes';
import { sampleResult } from '@/lib/sample';

export const dynamicParams = false;

export const metadata = {
  title: en.meta.pages.workflow.title,
  description: en.meta.pages.workflow.description,
};

export function generateStaticParams() {
  return sampleResult.workflows.map(({ id }) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowDetail workflowId={decodeSegment(id)} />;
}
