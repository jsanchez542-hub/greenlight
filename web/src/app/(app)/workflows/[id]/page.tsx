import { WorkflowDetail } from '@/components/workflows/WorkflowDetail';
import { decodeSegment } from '@/lib/routes';
import { pageMetadata } from '@/lib/server/metadata';

export const generateMetadata = () => pageMetadata('workflow');

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowDetail workflowId={decodeSegment(id)} />;
}
