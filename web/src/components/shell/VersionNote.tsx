'use client';

import { versionLabel } from '@/lib/version';
import styles from './VersionNote.module.css';
import { UpdateNotice } from './UpdateNotice';

interface VersionNoteProps {
  version: string;
  placement: 'sidebar' | 'page';
}

export function VersionNote({ version, placement }: VersionNoteProps) {
  const label = versionLabel(version);
  if (label === null) {
    return null;
  }
  const Wrap = placement === 'page' ? 'footer' : 'div';
  return (
    <Wrap className={styles.wrap} data-placement={placement}>
      <p className={styles.note}>{label}</p>
      <UpdateNotice variant="note" />
    </Wrap>
  );
}
