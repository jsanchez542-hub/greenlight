import { headers } from 'next/headers';
import { currentEnvironment } from '@/lib/server/environment';
import { isAllowedHost } from '@/lib/server/host';
import { checkSetup } from '@/lib/server/setup-check';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: noStore });
}

export async function GET(): Promise<Response> {
  try {
    const env = currentEnvironment();
    if (!isAllowedHost((await headers()).get('host'), env)) {
      return failure('This host is not allowed. Open the dashboard through localhost.', 403);
    }
    return Response.json(await checkSetup(env), { headers: noStore });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'The connection check failed.', 500);
  }
}
