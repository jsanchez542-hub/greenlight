import { versionLabel } from '@/lib/version';
import styles from './VersionNote.module.css';

interface VersionNoteProps {
  version: string;
  placement: 'sidebar' | 'page';
}

export function VersionNote({ version, placement }: VersionNoteProps) {
  const label = versionLabel(version);
  if (label === null) {
    return null;
  }
  const Tag = placement === 'page' ? 'footer' : 'p';
  return (
    <Tag className={styles.note} data-placement={placement}>
      {label}
    </Tag>
  );
}
