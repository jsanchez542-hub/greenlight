import { stepIconState, stepStatusLabel, type SetupStatus } from '@/lib/setup-status';
import { StatusIcon } from '../ui/StatusIcon';
import styles from './ConnectionCheck.module.css';

export function ConnectionCheck({ status }: { status: SetupStatus }) {
  return (
    <ol className={styles.steps}>
      {status.diagnosis.steps.map((step) => {
        const state = stepIconState(step.status);
        return (
          <li key={step.id} className={styles.step} data-state={state}>
            <div className={styles.head}>
              <StatusIcon state={state} />
              <span className={styles.label}>{step.label}</span>
              <span className={styles.status}>{stepStatusLabel[step.status]}</span>
            </div>
            <p className={styles.detail}>{step.detail}</p>
            {step.hint !== undefined && <p className={styles.hint}>{step.hint}</p>}
          </li>
        );
      })}
    </ol>
  );
}
