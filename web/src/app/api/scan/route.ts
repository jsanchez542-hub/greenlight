import { headers } from 'next/headers';
import { currentEnvironment } from '@/lib/server/environment';
import { isAllowedHost } from '@/lib/server/host';
import { isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: noStore });
}

async function refusal(request: Request, checkSite: boolean): Promise<Response | null> {
  const env = currentEnvironment();
  if (!isLiveScanConfigured(env)) {
    return failure('Live scanning is not configured on this server.', 404);
  }
  if (!isAllowedHost((await headers()).get('host'), env)) {
    return failure('This host is not allowed. Open the dashboard through localhost.', 403);
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (checkSite && fetchSite !== null && fetchSite !== 'same-origin') {
    return failure('Live scans can only be started from this dashboard.', 403);
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  return (await refusal(request, false)) ?? Response.json(liveCache().snapshot(), { headers: noStore });
}

export async function POST(request: Request): Promise<Response> {
  const refused = await refusal(request, true);
  if (refused !== null) {
    return refused;
  }
  const cache = liveCache();
  void cache.refresh();
  return Response.json(cache.snapshot(), { status: 202, headers: noStore });
}
