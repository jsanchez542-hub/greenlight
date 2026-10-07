'use client';

import { useSearchParams } from 'next/navigation';
import { useMessages } from '@/i18n/context';
import {
  countFindings,
  filterFindings,
  findingFilterToParams,
  keyFindings,
  noFindingFilter,
  parseFindingFilter,
  type FindingFilter,
} from '@/lib/findings';
import { useResult } from '@/lib/scan-context';
import { detectorNames, severities } from '@/lib/status';
import { useReplaceParams } from '@/lib/use-replace-params';
import { FilterGroup, type FilterOption } from '../ui/FilterGroup';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon } from '../ui/StatusIcon';
import { FindingRow } from './FindingRow';
import styles from './FindingsView.module.css';

export function FindingsView() {
  const t = useMessages();
  const result = useResult();
  const replaceParams = useReplaceParams();
  const filter = parseFindingFilter(useSearchParams());

  const entries = keyFindings(result.findings);
  const counts = countFindings(entries);
  const visible = filterFindings(entries, filter);

  const severityOptions: FilterOption[] = [
    { value: 'all', label: t.status.all, count: entries.length },
    ...severities.map((severity) => ({
      value: severity,
      label: t.status.severity[severity].toLowerCase(),
      count: counts.bySeverity[severity],
      state: severity,
    })),
  ];
  const checkOptions: FilterOption[] = [
    { value: 'all', label: t.status.all, count: entries.length },
    ...detectorNames.map((name) => ({
      value: name,
      label: t.checks.detectors[name].label.toLowerCase(),
      count: counts.byCheck[name],
    })),
  ];

  function update(next: Partial<FindingFilter>) {
    replaceParams(findingFilterToParams({ ...filter, ...next }));
  }

  return (
    <>
      <PageHeader title={t.findings.title} meta={t.findings.shown(visible.length, entries.length)} />

      {entries.length === 0 ? (
        <section className={styles.empty} data-state="healthy">
          <p className={styles.emptyTitle}>
            <StatusIcon state="healthy" />
            {t.findings.emptyTitle}
          </p>
          <p>{t.findings.emptyBody}</p>
        </section>
      ) : (
        <>
          <div className={styles.filters}>
            <FilterGroup
              label={t.filter.severity}
              options={severityOptions}
              value={filter.severity}
              onChange={(severity) => update({ severity: severity as FindingFilter['severity'] })}
            />
            <FilterGroup
              label={t.filter.check}
              options={checkOptions}
              value={filter.check}
              onChange={(check) => update({ check: check as FindingFilter['check'] })}
            />
          </div>

          {visible.length === 0 ? (
            <section className={styles.empty}>
              <p>{t.findings.noMatch}</p>
              <button type="button" onClick={() => replaceParams(findingFilterToParams(noFindingFilter))}>
                {t.findings.clear}
              </button>
            </section>
          ) : (
            <ul className={styles.list}>
              {visible.map((entry) => (
                <FindingRow key={entry.key} entry={entry} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
