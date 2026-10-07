'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMessages } from '@/i18n/context';
import { parseAddress, settingsLink } from '@/lib/address';
import styles from './ConnectForm.module.css';

interface ConnectFormProps {
  busy: boolean;
  onConnect: (address: string, key: string) => void;
}

export function ConnectForm({ busy, onConnect }: ConnectFormProps) {
  const t = useMessages();
  const text = t.setup.form;
  const ids = useId();
  const [address, setAddress] = useState('');
  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [missing, setMissing] = useState(false);
  const link = settingsLink(address);
  const addressProblem = address.trim() !== '' && parseAddress(address) === null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (address.trim() === '' || key.trim() === '') {
      setMissing(true);
      return;
    }
    setMissing(false);
    const sent = key;
    setKey('');
    setRevealed(false);
    onConnect(address, sent);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate autoComplete="off">
      <div className={styles.step}>
        <p className={styles.number} aria-hidden="true">
          1
        </p>
        <div className={styles.body}>
          <label htmlFor={`${ids}-address`} className={styles.label}>
            {text.addressLabel}
          </label>
          <input
            id={`${ids}-address`}
            className={styles.input}
            type="text"
            inputMode="url"
            value={address}
            placeholder={text.addressPlaceholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={`${ids}-address-help`}
            aria-invalid={addressProblem}
            onChange={(event) => setAddress(event.target.value)}
          />
          <p id={`${ids}-address-help`} className={styles.help}>
            {addressProblem ? text.addressInvalid : text.addressHelp}
          </p>
          {link !== null && (
            <div className={styles.keyHelp}>
              <a className={styles.secondary} href={link} target="_blank" rel="noopener noreferrer">
                {text.openSettings}
                <span className="visually-hidden">{text.newTab}</span>
              </a>
              <p className={styles.help}>{text.keyHelpLink}</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.step}>
        <p className={styles.number} aria-hidden="true">
          2
        </p>
        <div className={styles.body}>
          <label htmlFor={`${ids}-key`} className={styles.label}>
            {text.keyLabel}
          </label>
          <div className={styles.keyRow}>
            <input
              id={`${ids}-key`}
              className={styles.input}
              type={revealed ? 'text' : 'password'}
              value={key}
              placeholder={text.keyPlaceholder}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={`${ids}-key-help`}
              onChange={(event) => setKey(event.target.value)}
            />
            <button
              type="button"
              className={styles.reveal}
              aria-pressed={revealed}
              aria-controls={`${ids}-key`}
              onClick={() => setRevealed((shown) => !shown)}
            >
              {revealed ? text.hide : text.show}
              <span className="visually-hidden">{text.theKey}</span>
            </button>
          </div>
          <p id={`${ids}-key-help`} className={styles.help}>
            {text.keyHelp}
          </p>
        </div>
      </div>

      {missing && (
        <p className={styles.problem} role="alert">
          {text.missing}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy} aria-busy={busy}>
          {busy ? text.connecting : text.connect}
        </button>
      </div>
    </form>
  );
}
