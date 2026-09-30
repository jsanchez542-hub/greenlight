import type { WorkflowHealth } from 'greenlight';
import { StatusIcon } from './StatusIcon';
import styles from './FilterGroup.module.css';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  state?: WorkflowHealth;
}

interface FilterGroupProps {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterGroup({ label, options, value, onChange }: FilterGroupProps) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={styles.option}
            aria-pressed={selected}
            disabled={option.count === 0 && !selected}
            data-state={option.state}
            onClick={() => onChange(option.value)}
          >
            {option.state !== undefined && <StatusIcon state={option.state} />}
            {option.label}
            <span className={styles.count}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
