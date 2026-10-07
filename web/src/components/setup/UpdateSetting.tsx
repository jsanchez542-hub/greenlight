'use client';

import { useId, useState } from 'react';
import { useMessages } from '@/i18n/context';
import { failureText } from '@/lib/failure';
import { useUpdates } from '@/lib/use-updates';
import styles from './SetupView.module.css';

export function UpdateSetting() {
  const t = useMessages();
  const ids = useId();
  const { state, choose, phase, problem, overridden } = useUpdates();
  const [intended, setIntended] = useState<boolean | null>(null);

  if (state === null) {
    return null;
  }
  const saving = phase === 'saving';

  async function change(enabled: boolean) {
    setIntended(enabled);
    await choose(enabled);
    setIntended(null);
  }

  return (
    <section className={styles.updates}>
      <label className={styles.choice} htmlFor={`${ids}-updates`}>
        <input
          id={`${ids}-updates`}
          type="checkbox"
          checked={intended ?? state.enabled}
          disabled={saving}
          aria-describedby={`${ids}-updates-help`}
          onChange={(event) => void change(event.target.checked)}
        />
        <span>{t.updates.settingLabel}</span>
      </label>
      <p id={`${ids}-updates-help`} className={styles.notice}>
        {t.updates.settingHelp}
      </p>
      <div className={styles.outcome} role="status" aria-live="polite">
        {saving && <p className={styles.notice}>{t.updates.saving}</p>}
        {phase === 'saved' && !overridden && <p className={styles.notice}>{t.updates.saved}</p>}
        {phase === 'saved' && overridden && <p className={styles.notice}>{t.setup.notices.processEnv}</p>}
        {phase === 'failed' && problem !== null && (
          <p className={styles.problem}>
            {t.updates.notSaved} {failureText(problem.code, t, problem.seconds)}
          </p>
        )}
      </div>
    </section>
  );
}
