'use client';

import Link from 'next/link';
import { useMessages } from '@/i18n/context';
import styles from './not-found.module.css';

export default function NotFound() {
  const t = useMessages();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.body}</p>
        <Link href="/" className={styles.link}>
          {t.notFound.home}
        </Link>
      </section>
    </main>
  );
}
