import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {meta !== undefined && <p className={styles.meta}>{meta}</p>}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
