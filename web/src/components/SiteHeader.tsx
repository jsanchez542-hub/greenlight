import styles from './SiteHeader.module.css';

type Source = 'demo' | 'live';

interface SiteHeaderProps {
  source: Source;
  liveAvailable: boolean;
  canRescan: boolean;
  onSelectDemo: () => void;
  onSelectLive: () => void;
}

function Mark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader({
  source,
  liveAvailable,
  canRescan,
  onSelectDemo,
  onSelectLive,
}: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Mark />
          <span className={styles.name}>GreenLight</span>
          <span className={styles.tagline}>n8n scan results</span>
        </div>

        {liveAvailable ? (
          <div className={styles.controls}>
            <div className={styles.switch} role="group" aria-label="Data source">
              <button type="button" aria-pressed={source === 'demo'}
                onClick={source === 'demo' ? undefined : onSelectDemo}>
                Demo data
              </button>
              <button type="button" aria-pressed={source === 'live'}
                onClick={source === 'live' ? undefined : onSelectLive}>
                Live instance
              </button>
            </div>
            {canRescan && (
              <button type="button" className={styles.rescan} onClick={onSelectLive}>
                Scan again
              </button>
            )}
          </div>
        ) : (
          <p className={styles.note}>
            <span className={styles.pill}>Demo data</span>
            Synthetic workflows produced by GreenLight. No instance is contacted.
          </p>
        )}
      </div>
    </header>
  );
}
