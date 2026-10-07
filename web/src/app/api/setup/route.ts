import { apiError, apiJson, authorize, methodNotAllowed, optionsResponse } from '@/lib/server/api';
import { currentLanguage } from '@/lib/server/language';
import { checkSetup } from '@/lib/server/setup-check';

export const dynamic = 'force-dynamic';

const ALLOW = 'GET, OPTIONS';

export async function GET(request: Request): Promise<Response> {
  const access = await authorize(request);
  if ('refusal' in access) {
    return access.refusal;
  }
  try {
    return apiJson(await checkSetup(await currentLanguage(), access.env));
  } catch {
    return apiError('checkFailed', 500);
  }
}

export const OPTIONS = optionsResponse(ALLOW);
export const HEAD = methodNotAllowed(ALLOW);
export const POST = methodNotAllowed(ALLOW);
export const PUT = methodNotAllowed(ALLOW);
export const PATCH = methodNotAllowed(ALLOW);
export const DELETE = methodNotAllowed(ALLOW);
