import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

/**
 * The title is often a name the instance wrote. It is set apart from the text around it, so a name
 * in another writing direction, or one that carries direction marks, changes nothing but itself.
 */
export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>
          <bdi>{title}</bdi>
        </h1>
        {meta !== undefined && <p className={styles.meta}>{meta}</p>}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
