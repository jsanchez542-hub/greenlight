'use client';

import { useSearchParams } from 'next/navigation';
import { detectorInfo } from '@/lib/detectors';
import {
  countFindings,
  filterFindings,
  findingFilterToParams,
  keyFindings,
  noFindingFilter,
  parseFindingFilter,
  type FindingFilter,
} from '@/lib/findings';
import { pluralise } from '@/lib/format';
import { useResult } from '@/lib/scan-context';
import { detectorNames, severities, severityLabel } from '@/lib/status';
import { useReplaceParams } from '@/lib/use-replace-params';
import { FilterGroup, type FilterOption } from '../ui/FilterGroup';
import { PageHeader } from '../ui/PageHeader';
import { StatusIcon } from '../ui/StatusIcon';
import { FindingRow } from './FindingRow';
import styles from './FindingsView.module.css';

export function FindingsView() {
  const result = useResult();
  const replaceParams = useReplaceParams();
  const filter = parseFindingFilter(useSearchParams());

  const entries = keyFindings(result.findings);
  const counts = countFindings(entries);
  const visible = filterFindings(entries, filter);

  const severityOptions: FilterOption[] = [
    { value: 'all', label: 'all', count: entries.length },
    ...severities.map((severity) => ({
      value: severity,
      label: severityLabel[severity].toLowerCase(),
      count: counts.bySeverity[severity],
      state: severity,
    })),
  ];
  const checkOptions: FilterOption[] = [
    { value: 'all', label: 'all', count: entries.length },
    ...detectorNames.map((name) => ({
      value: name,
      label: detectorInfo[name].label.toLowerCase(),
      count: counts.byCheck[name],
    })),
  ];

  function update(next: Partial<FindingFilter>) {
    replaceParams(findingFilterToParams({ ...filter, ...next }));
  }

  return (
    <>
      <PageHeader
        title="findings"
        meta={`${visible.length} of ${pluralise(entries.length, 'finding')} shown`}
      />

      {entries.length === 0 ? (
        <section className={styles.empty} data-state="healthy">
          <p className={styles.emptyTitle}>
            <StatusIcon state="healthy" />
            Nothing to report
          </p>
          <p>None of the checks raised a finding in this scan.</p>
        </section>
      ) : (
        <>
          <div className={styles.filters}>
            <FilterGroup
              label="severity"
              options={severityOptions}
              value={filter.severity}
              onChange={(severity) => update({ severity: severity as FindingFilter['severity'] })}
            />
            <FilterGroup
              label="check"
              options={checkOptions}
              value={filter.check}
              onChange={(check) => update({ check: check as FindingFilter['check'] })}
            />
          </div>

          {visible.length === 0 ? (
            <section className={styles.empty}>
              <p>No finding matches these filters.</p>
              <button type="button" onClick={() => replaceParams(findingFilterToParams(noFindingFilter))}>
                Clear filters
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
