import { apiError, apiJson, authorize } from '@/lib/server/api';
import { isLiveScanConfigured, liveCache } from '@/lib/server/live-scan';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const access = await authorize(request);
  if ('refusal' in access) {
    return access.refusal;
  }
  if (!isLiveScanConfigured(access.env)) {
    return apiError('Live scanning is not configured on this server.', 404);
  }
  return apiJson(liveCache(access.env).snapshot());
}

export async function POST(request: Request): Promise<Response> {
  const access = await authorize(request);
  if ('refusal' in access) {
    return access.refusal;
  }
  if (!isLiveScanConfigured(access.env)) {
    return apiError('Live scanning is not configured on this server.', 404);
  }

  const cache = liveCache(access.env);
  const outcome = cache.forceRefresh();
  if (!outcome.accepted) {
    return apiError(
      `A scan ran moments ago. Try again in ${outcome.retryAfterSeconds} seconds.`,
      429,
      { 'Retry-After': String(outcome.retryAfterSeconds) },
    );
  }
  return apiJson(cache.snapshot(), 202);
}
