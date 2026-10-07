import styles from './Logo.module.css';

export function Logo({ size }: { size: number }) {
  return (
    <span className={styles.logo}>
      <img
        className={styles.onLight}
        src="/logo/logo-on-light-512.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
      <img
        className={styles.onDark}
        src="/logo/logo-on-dark-512.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
    </span>
  );
}
