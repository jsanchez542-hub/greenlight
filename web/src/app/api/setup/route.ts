import { apiError, apiJson, authorize } from '@/lib/server/api';
import { checkSetup } from '@/lib/server/setup-check';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const access = await authorize(request);
  if ('refusal' in access) {
    return access.refusal;
  }
  try {
    return apiJson(await checkSetup(access.env));
  } catch {
    return apiError('The connection check failed.', 500);
  }
}
