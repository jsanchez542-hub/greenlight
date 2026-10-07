'use client';

import type { WorkflowSummary } from 'greenlight';
import Link from 'next/link';
import { useMessages } from '@/i18n/context';
import { workflowHref } from '@/lib/routes';
import { healthStates } from '@/lib/status';
import { StatusIcon, StatusLabel } from '../ui/StatusIcon';
import styles from './WorkflowMap.module.css';

export function WorkflowMap({ workflows }: { workflows: readonly WorkflowSummary[] }) {
  const t = useMessages();
  const lanes = healthStates
    .map((state) => ({ state, members: workflows.filter((workflow) => workflow.health === state) }))
    .filter((lane) => lane.members.length > 0);

  if (lanes.length === 0) {
    return null;
  }

  return (
    <section className={styles.map} aria-labelledby="map-heading">
      <div className={styles.head}>
        <h2 id="map-heading">{t.overview.mapTitle}</h2>
        <p>{t.overview.mapBody}</p>
      </div>
      <div className={styles.lanes}>
        {lanes.map(({ state, members }) => (
          <div key={state} className={styles.lane} data-state={state}>
            <h3 className={styles.laneTitle}>
              <StatusLabel state={state} label={t.status.health[state].label} />
              <span>{members.length}</span>
            </h3>
            <ul className={styles.nodes}>
              {members.map((workflow) => (
                <li key={workflow.id} className={styles.node}>
                  <Link href={workflowHref(workflow.id)} className={styles.nodeLink}>
                    <span className={styles.glyph}>
                      <StatusIcon state={state} />
                    </span>
                    <span className={styles.name}>{workflow.name}</span>
                    <span className="visually-hidden">, {t.status.health[state].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
