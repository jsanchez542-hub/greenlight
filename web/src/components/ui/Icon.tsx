import type { ReactNode } from 'react';
import styles from './Icon.module.css';

export type IconName =
  | 'overview'
  | 'findings'
  | 'workflows'
  | 'checks'
  | 'collapse'
  | 'scan'
  | 'search'
  | 'chevron'
  | 'help';

const paths: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  findings: (
    <>
      <path d="M5.5 21V3.5" />
      <path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" />
    </>
  ),
  workflows: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 8.5v7M8.2 6.9l7.6 4M8.2 17.1l7.6-4" />
    </>
  ),
  checks: (
    <>
      <path d="m3.5 6.5 1.8 1.8 3-3.4M3.5 16.5l1.8 1.8 3-3.4" />
      <path d="M12 7h8.5M12 17h8.5" />
    </>
  ),
  collapse: <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />,
  scan: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  chevron: <path d="m7 14.5 5-5 5 5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6" />
      <path d="M12 17.2v.01" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
