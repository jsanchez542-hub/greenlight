import Image from 'next/image';
import styles from './Logo.module.css';

export function Logo({ size }: { size: number }) {
  return (
    <span className={styles.logo} style={{ width: size, height: size }}>
      <Image
        className={styles.onLight}
        src="/logo/logo-on-light-512.png"
        alt=""
        width={size}
        height={size}
        loading="eager"
      />
      <Image
        className={styles.onDark}
        src="/logo/logo-on-dark-512.png"
        alt=""
        width={size}
        height={size}
        loading="eager"
      />
    </span>
  );
}
