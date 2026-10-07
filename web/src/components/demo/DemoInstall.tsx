'use client';

import { useMessages } from '@/i18n/context';
import { INSTALL_COMMANDS, REPOSITORY_URL } from '@/lib/demo';
import { CopyButton } from '../ui/CopyButton';
import { PageHeader } from '../ui/PageHeader';
import styles from './DemoInstall.module.css';

/** What the Connect page becomes in the demo, where nothing can be connected: how to run GreenLight for real. */
export function DemoInstall() {
  const t = useMessages();
  const commands = INSTALL_COMMANDS.join('\n');

  return (
    <>
      <PageHeader title={t.demo.title} meta={t.demo.meta} />

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="install-heading">
          <h2 id="install-heading" className={styles.heading}>
            {t.demo.heading}
          </h2>
          <p className={styles.body}>{t.demo.body}</p>

          <div className={styles.code} role="group" aria-label={t.demo.commands}>
            <pre>
              <code>{commands}</code>
            </pre>
            <CopyButton text={commands} label={t.demo.commandsCopy} />
          </div>

          <p className={styles.body}>{t.demo.needs}</p>

          <a className={styles.repository} href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            {t.demo.repository}
            <span className="visually-hidden">{t.setup.form.newTab}</span>
          </a>
        </section>
      </div>
    </>
  );
}
