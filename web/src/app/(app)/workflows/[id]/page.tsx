import { WorkflowDetail } from '@/components/workflows/WorkflowDetail';
import { decodeSegment } from '@/lib/routes';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowDetail workflowId={decodeSegment(id)} />;
}
