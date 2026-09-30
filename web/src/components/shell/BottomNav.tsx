'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeSection, sections } from '@/lib/navigation';
import { Icon } from '../ui/Icon';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const current = activeSection(usePathname());

  return (
    <nav className={styles.bar} aria-label="Sections">
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={section.href}
              className={styles.link}
              aria-current={current?.id === section.id ? 'page' : undefined}
            >
              <Icon name={section.id} />
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
