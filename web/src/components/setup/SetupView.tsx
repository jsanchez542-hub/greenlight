'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { requestConnect, requestDisconnect, type ConnectResult } from '@/lib/connect-client';
import { useScanControls } from '@/lib/scan-context';
import { setupPhase } from '@/lib/setup-status';
import { useSetupStatus } from '@/lib/use-setup-status';
import { CopyButton } from '../ui/CopyButton';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon } from '../ui/StatusIcon';
import { ConnectForm } from './ConnectForm';
import { ConnectionCheck } from './ConnectionCheck';
import styles from './SetupView.module.css';

const TERMINAL_COMMAND = 'npm run setup';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

export function SetupView() {
  const router = useRouter();
  const { connectLive, disconnectLive } = useScanControls();
  const { status, error, checkAgain } = useSetupStatus();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const request = useRef<AbortController | null>(null);

  const phase = status === null ? null : setupPhase(status);
  const justSaved = result?.saved === true;
  const showConnected = justSaved || (phase === 'connected' && !editing);
  const connected = justSaved ? result?.diagnosis : status?.diagnosis;

  async function connect(address: string, key: string) {
    request.current?.abort();
    request.current = new AbortController();
    setBusy(true);
    setProblem(null);
    setNotice(null);
    setResult(null);
    try {
      const answer = await requestConnect(address.trim(), key, request.current.signal);
      setResult(answer);
      if (answer.saved) {
        setEditing(false);
        setNotice(answer.notice);
        connectLive();
        void checkAgain();
      }
    } catch (failure) {
      setProblem(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const answer = await requestDisconnect(new AbortController().signal);
      if (answer.disconnected) {
        setResult(null);
        setEditing(false);
        disconnectLive();
        await checkAgain();
      }
      setNotice(answer.notice ?? (answer.disconnected ? 'Disconnected. The dashboard shows sample data again.' : null));
    } catch (failure) {
      setProblem(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  function openDashboard() {
    connectLive();
    router.push('/');
  }

  return (
    <>
      <PageHeader title="connect your n8n" meta="GreenLight only reads. Your key stays on this computer." />

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="connect-heading">
          <h2 id="connect-heading" className="visually-hidden">
            {showConnected ? 'Connected' : 'Connect'}
          </h2>

          {showConnected && connected !== undefined ? (
            <div className={styles.connected} data-state="healthy">
              <p className={styles.headline}>
                <StatusIcon state="healthy" />
                <span>
                  Connected to {connected.host}. {connected.workflowCount}{' '}
                  {connected.workflowCount === 1 ? 'workflow' : 'workflows'} found.
                </span>
              </p>
              <div className={styles.buttons}>
                <button type="button" className={styles.primary} onClick={openDashboard}>
                  Open the dashboard
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setResult(null);
                    setEditing(true);
                    setNotice(null);
                  }}
                >
                  Change key
                </button>
                <button type="button" className={styles.secondary} onClick={disconnect} disabled={busy}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <ConnectForm busy={busy} onConnect={connect} />
          )}

          <div className={styles.outcome} role="status" aria-live="polite">
            {problem !== null && (
              <p className={styles.problem} role="alert">
                {problem}
              </p>
            )}
            {notice !== null && <p className={styles.notice}>{notice}</p>}
            {error !== null && !showConnected && <p className={styles.notice}>{error}</p>}
            {result !== null && !result.saved && (
              <>
                <p className={styles.problem}>
                  Not connected yet. Fix the step marked Failed, then paste the key again and press Connect.
                </p>
                <ConnectionCheck status={{ hasAddress: true, hasKey: true, diagnosis: result.diagnosis }} />
              </>
            )}
            {result === null && !showConnected && status !== null && phase === 'failing' && (
              <>
                <p className={styles.notice}>The saved connection does not work at the moment.</p>
                <ConnectionCheck status={status} />
              </>
            )}
          </div>
        </section>

        <details className={styles.terminal}>
          <summary>Prefer the terminal?</summary>
          <p>
            Open a terminal in the GreenLight folder and run this. It asks for the same two things and saves them for you.
          </p>
          <div className={styles.code}>
            <code>{TERMINAL_COMMAND}</code>
            <CopyButton text={TERMINAL_COMMAND} label="the command" />
          </div>
        </details>
      </div>
    </>
  );
}
