'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useMessages } from '@/i18n/context';
import { requestConnect, requestDisconnect, type ConnectNotice, type ConnectResult } from '@/lib/connect-client';
import { ApiFailure, failureCodeOf, failureText, type FailureCode } from '@/lib/failure';
import { useScanControls } from '@/lib/scan-context';
import { useUpdates } from '@/lib/use-updates';
import { setupPhase } from '@/lib/setup-status';
import { useSetupStatus } from '@/lib/use-setup-status';
import { CopyButton } from '../ui/CopyButton';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon } from '../ui/StatusIcon';
import { ConnectForm } from './ConnectForm';
import { ConnectionCheck } from './ConnectionCheck';
import { UpdateSetting } from './UpdateSetting';
import styles from './SetupView.module.css';

const TERMINAL_COMMAND = 'npm run setup';

interface Problem {
  code: FailureCode;
  seconds: number | null;
}

function problemOf(failure: unknown): Problem {
  return { code: failureCodeOf(failure), seconds: failure instanceof ApiFailure ? failure.seconds : null };
}

export function SetupView() {
  const t = useMessages();
  const router = useRouter();
  const { connectLive, disconnectLive } = useScanControls();
  const { status, error, checkAgain } = useSetupStatus();
  const updates = useUpdates();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<ConnectNotice | 'disconnected' | null>(null);
  const [editing, setEditing] = useState(false);
  const request = useRef<AbortController | null>(null);

  const phase = status === null ? null : setupPhase(status);
  const justSaved = result?.saved === true;
  const showConnected = justSaved || (phase === 'connected' && !editing);
  const checking = status === null && error === null && result === null && !editing;
  const connected = justSaved ? result?.diagnosis : status?.diagnosis;

  async function connect(address: string, key: string, notify: boolean) {
    request.current?.abort();
    request.current = new AbortController();
    setBusy(true);
    setProblem(null);
    setNotice(null);
    setResult(null);
    try {
      const answer = await requestConnect(address.trim(), key, request.current.signal, fetch, notify);
      setResult(answer);
      if (answer.saved) {
        setEditing(false);
        setNotice(answer.notice);
        connectLive();
        void checkAgain();
        void updates.refresh();
      }
    } catch (failure) {
      setProblem(problemOf(failure));
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
      setNotice(answer.notice ?? (answer.disconnected ? 'disconnected' : null));
    } catch (failure) {
      setProblem(problemOf(failure));
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
      <PageHeader title={t.setup.title} meta={t.setup.meta} />

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="connect-heading">
          <h2 id="connect-heading" className="visually-hidden">
            {showConnected ? t.setup.connectedHeading : t.setup.connectHeading}
          </h2>

          {showConnected && connected !== undefined ? (
            <div className={styles.connected} data-state="healthy">
              <p className={styles.headline}>
                <StatusIcon state="healthy" />
                <span>{t.setup.connectedTo(connected.host ?? '', connected.workflowCount ?? 0)}</span>
              </p>
              <div className={styles.buttons}>
                <button type="button" className={styles.primary} onClick={openDashboard}>
                  {t.setup.openDashboard}
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
                  {t.setup.changeKey}
                </button>
                <button type="button" className={styles.secondary} onClick={disconnect} disabled={busy}>
                  {t.setup.disconnect}
                </button>
              </div>
            </div>
          ) : checking ? (
            <p className={styles.notice} role="status">
              {t.setup.checking}
            </p>
          ) : (
            <ConnectForm
              busy={busy}
              notifyByDefault={!(updates.state?.enabled === false && updates.state.chosen)}
              onConnect={connect}
            />
          )}

          <div className={styles.outcome} role="status" aria-live="polite">
            {problem !== null && (
              <p className={styles.problem} role="alert">
                {failureText(problem.code, t, problem.seconds)}
              </p>
            )}
            {notice !== null && (
              <p className={styles.notice}>
                {notice === 'disconnected' ? t.setup.disconnected : t.setup.notices[notice]}
              </p>
            )}
            {error !== null && !showConnected && <p className={styles.notice}>{failureText(error, t)}</p>}
            {result !== null && !result.saved && (
              <>
                <p className={styles.problem}>{t.setup.notYet}</p>
                <ConnectionCheck status={{ hasAddress: true, hasKey: true, diagnosis: result.diagnosis }} />
              </>
            )}
            {result === null && !showConnected && status !== null && phase === 'failing' && (
              <>
                <p className={styles.notice}>{t.setup.savedFails}</p>
                <ConnectionCheck status={status} />
              </>
            )}
          </div>
        </section>

        {showConnected && <UpdateSetting />}

        <details className={styles.terminal}>
          <summary>{t.setup.terminalSummary}</summary>
          <p>{t.setup.terminalBody}</p>
          <div className={styles.code}>
            <code>{TERMINAL_COMMAND}</code>
            <CopyButton text={TERMINAL_COMMAND} label={t.copy.setupCommand} />
          </div>
        </details>
      </div>
    </>
  );
}
