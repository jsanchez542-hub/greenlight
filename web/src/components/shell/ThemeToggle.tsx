'use client';

import { themeButtonLabel, themeLabel, type ThemePreference } from '@/lib/theme';
import { useTheme } from '@/lib/use-theme';
import { Icon, type IconName } from '../ui/Icon';
import styles from './ThemeToggle.module.css';

const icons: Record<ThemePreference, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};

export function ThemeToggle({ placement }: { placement: 'sidebar' | 'top' }) {
  const { preference, systemDark, cycle } = useTheme();
  const label = themeButtonLabel(preference, systemDark);

  return (
    <button
      type="button"
      className={styles.toggle}
      data-placement={placement}
      aria-label={label}
      title={label}
      onClick={cycle}
    >
      <Icon name={icons[preference]} />
      <span className={styles.text} aria-hidden="true">
        Theme: {themeLabel[preference]}
      </span>
    </button>
  );
}
