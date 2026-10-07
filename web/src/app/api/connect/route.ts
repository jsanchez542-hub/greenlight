import { headers } from 'next/headers';
import { createLimiter, handleConnect } from '@/lib/server/connect';
import { currentEnvironment, envFilePath, type Environment } from '@/lib/server/environment';
import { apiError, methodNotAllowed, optionsResponse } from '@/lib/server/api';
import { currentLanguage } from '@/lib/server/language';

export const dynamic = 'force-dynamic';

const ALLOW = 'POST, OPTIONS';
const limiter = createLimiter();

function readableEnvironment(): Environment {
  try {
    return currentEnvironment();
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<Response> {
  const host = (await headers()).get('host');
  try {
    return await handleConnect(request, {
      host,
      lang: await currentLanguage(),
      env: readableEnvironment(),
      processEnv: process.env,
      filePath: envFilePath(),
      limiter,
    });
  } catch {
    return apiError('saveFailed', 500);
  }
}

export const OPTIONS = optionsResponse(ALLOW);
export const GET = methodNotAllowed(ALLOW);
export const HEAD = methodNotAllowed(ALLOW);
export const PUT = methodNotAllowed(ALLOW);
export const PATCH = methodNotAllowed(ALLOW);
export const DELETE = methodNotAllowed(ALLOW);
