import { describeScanFailure, isLiveScanConfigured, runLiveScan } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  if (!isLiveScanConfigured()) {
    return failure('Live scanning is not configured on this server.', 404);
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null && fetchSite !== 'same-origin') {
    return failure('Live scans can only be started from this dashboard.', 403);
  }

  try {
    return Response.json(await runLiveScan(), { headers });
  } catch (error) {
    return failure(describeScanFailure(error), 502);
  }
}
