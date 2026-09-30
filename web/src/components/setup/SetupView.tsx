'use client';

import { useRouter } from 'next/navigation';
import { useScanControls } from '@/lib/scan-context';
import { setupPhase } from '@/lib/setup-status';
import { useSetupStatus } from '@/lib/use-setup-status';
import { CopyButton } from '../ui/CopyButton';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon } from '../ui/StatusIcon';
import { ConnectionCheck } from './ConnectionCheck';
import styles from './SetupView.module.css';

const SETUP_COMMAND = 'npm run setup';
const ENV_TEMPLATE = 'N8N_BASE_URL=https://your-n8n.example.com\nN8N_API_KEY=paste-your-key-here';

function Guide() {
  return (
    <ol className={styles.guide}>
      <li>
        <h3>Create an API key in n8n</h3>
        <p>
          In n8n open Settings, then n8n API, then Create an API key. Copy it right away: n8n shows it
          only once. Read access is enough. GreenLight never writes to your instance.
        </p>
      </li>
      <li>
        <h3>Save it in this project</h3>
        <p>In a terminal, in the project folder (the one with package.json), run:</p>
        <div className={styles.code}>
          <code>{SETUP_COMMAND}</code>
          <CopyButton text={SETUP_COMMAND} label="the setup command" />
        </div>
        <p>It asks for the address and the key, checks them and writes a .env file. To do it by hand, create .env in that folder with:</p>
        <div className={styles.code}>
          <pre>{ENV_TEMPLATE}</pre>
          <CopyButton text={ENV_TEMPLATE} label="the .env lines" />
        </div>
      </li>
      <li>
        <h3>Check the connection</h3>
        <p>Press Check again. This page also checks by itself every few seconds.</p>
      </li>
    </ol>
  );
}

export function SetupView() {
  const router = useRouter();
  const { selectLive } = useScanControls();
  const { status, error, checking, checkAgain } = useSetupStatus();
  const phase = status === null ? null : setupPhase(status);

  function openLiveView() {
    router.refresh();
    selectLive();
    router.push('/');
  }

  return (
    <>
      <PageHeader
        title="connect your n8n"
        meta="GreenLight reads your instance through its API and never writes to it."
      />

      {phase === 'connected' && status !== null && (
        <section className={styles.connected} data-state="healthy" aria-labelledby="connected-heading">
          <h2 id="connected-heading">
            <StatusIcon state="healthy" />
            Connected to {status.diagnosis.host}, {status.diagnosis.workflowCount}{' '}
            {status.diagnosis.workflowCount === 1 ? 'workflow' : 'workflows'} visible
          </h2>
          <p>Everything GreenLight needs is in place.</p>
          <button type="button" className={styles.primary} onClick={openLiveView}>
            Open live view
          </button>
        </section>
      )}

      <div className={styles.layout}>
        {phase !== 'connected' && (
          <section aria-labelledby="guide-heading" className={styles.panel}>
            <h2 id="guide-heading">three steps</h2>
            <Guide />
          </section>
        )}

        <section aria-labelledby="check-heading" className={styles.panel}>
          <div className={styles.checkHead}>
            <h2 id="check-heading">connection check</h2>
            <button type="button" className={styles.secondary} onClick={checkAgain} disabled={checking}>
              {checking ? 'Checking' : 'Check again'}
            </button>
          </div>
          {error !== null && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {status === null && error === null && <p className={styles.note}>Checking…</p>}
          {phase === 'waiting' && (
            <p className={styles.note}>
              Nothing is saved yet. Once you finish step 2 this list fills in on its own.
            </p>
          )}
          {status !== null && phase !== 'waiting' && <ConnectionCheck status={status} />}
        </section>
      </div>
    </>
  );
}
