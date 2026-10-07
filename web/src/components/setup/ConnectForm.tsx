'use client';

import { useId, useState, type FormEvent } from 'react';
import { parseAddress, settingsLink } from '@/lib/address';
import styles from './ConnectForm.module.css';

interface ConnectFormProps {
  busy: boolean;
  onConnect: (address: string, key: string) => void;
}

export function ConnectForm({ busy, onConnect }: ConnectFormProps) {
  const ids = useId();
  const [address, setAddress] = useState('');
  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const link = settingsLink(address);
  const addressProblem = address.trim() !== '' && parseAddress(address) === null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (address.trim() === '' || key.trim() === '') {
      setMissing('Fill in the address and the key.');
      return;
    }
    setMissing(null);
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
            Your n8n address
          </label>
          <input
            id={`${ids}-address`}
            className={styles.input}
            type="text"
            inputMode="url"
            value={address}
            placeholder="https://n8n.yourcompany.com"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={`${ids}-address-help`}
            aria-invalid={addressProblem}
            onChange={(event) => setAddress(event.target.value)}
          />
          <p id={`${ids}-address-help`} className={styles.help}>
            {addressProblem
              ? 'That does not look like a web address. Start it with https://'
              : 'The address you type in your browser to open n8n.'}
          </p>
          {link !== null && (
            <div className={styles.keyHelp}>
              <a className={styles.secondary} href={link} target="_blank" rel="noopener noreferrer">
                Open n8n settings
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <p className={styles.help}>
                In n8n choose Settings, then n8n API, then Create an API key. Copy it: n8n shows it only once. A key
                that can only read is enough.
              </p>
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
            API key
          </label>
          <div className={styles.keyRow}>
            <input
              id={`${ids}-key`}
              className={styles.input}
              type={revealed ? 'text' : 'password'}
              value={key}
              placeholder="Paste the key here"
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
              {revealed ? 'Hide' : 'Show'}
              <span className="visually-hidden"> the key</span>
            </button>
          </div>
          <p id={`${ids}-key-help`} className={styles.help}>
            GreenLight only reads. The key is kept on this computer and is cleared from this form once sent.
          </p>
        </div>
      </div>

      {missing !== null && (
        <p className={styles.problem} role="alert">
          {missing}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy} aria-busy={busy}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </form>
  );
}
