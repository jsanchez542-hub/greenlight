import { diagnose as runDiagnosis, type Diagnosis, type DiagnoseInput } from 'greenlight';
import type { Lang } from '@/i18n';
import type { SetupStatus } from '../setup-status';
import { currentEnvironment, type Environment } from './environment';

const REUSE_WINDOW_MS = 2_000;

interface SetupCheckerOptions {
  diagnose?: (input: DiagnoseInput) => Promise<Diagnosis>;
  now?: () => number;
}

interface Recent {
  settings: string;
  at: number;
  status: Promise<SetupStatus>;
}

export function createSetupChecker({ diagnose = runDiagnosis, now = Date.now }: SetupCheckerOptions = {}) {
  let recent: Recent | null = null;

  return function check(lang: Lang, env: Environment = currentEnvironment()): Promise<SetupStatus> {
    const baseUrl = env['N8N_BASE_URL']?.trim();
    const apiKey = env['N8N_API_KEY']?.trim();
    const settings = `${lang}\n${baseUrl ?? ''}\n${apiKey ?? ''}\n${env['GREENLIGHT_ALLOW_INSECURE_HTTP'] ?? ''}`;

    if (recent !== null && recent.settings === settings && now() - recent.at < REUSE_WINDOW_MS) {
      return recent.status;
    }

    const allowInsecureHttp = ['1', 'true'].includes((env['GREENLIGHT_ALLOW_INSECURE_HTTP'] ?? '').trim().toLowerCase());
    const status = diagnose({ baseUrl, apiKey, allowInsecureHttp, lang }).then((diagnosis) => ({
      hasAddress: Boolean(baseUrl),
      hasKey: Boolean(apiKey),
      diagnosis,
    }));
    recent = { settings, at: now(), status };
    return status;
  };
}

export const checkSetup = createSetupChecker();
