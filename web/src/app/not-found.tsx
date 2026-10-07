import Link from 'next/link';
import { currentMessages } from '@/lib/server/language';
import styles from './not-found.module.css';

export default async function NotFound() {
  const t = await currentMessages();

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
