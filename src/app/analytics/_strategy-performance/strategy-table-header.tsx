import type { SortDir, SortKey } from './types';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={`ml-1 inline h-3 w-3 ${active ? 'text-gray-700' : 'text-gray-300'}`}
      viewBox="0 0 10 14"
      fill="currentColor"
    >
      {dir === 'asc' || !active ? (
        <path d="M5 0L10 6H0L5 0Z" opacity={active && dir === 'asc' ? 1 : 0.3} />
      ) : null}
      {dir === 'desc' || !active ? (
        <path d="M5 14L0 8H10L5 14Z" opacity={active && dir === 'desc' ? 1 : 0.3} />
      ) : null}
    </svg>
  );
}

const thClass =
  'px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase cursor-pointer select-none hover:text-gray-900 transition-colors';

export function StrategyTableHeader({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <thead>
      <tr>
        <th
          aria-label="Expand row"
          className="py-3 pr-4 text-left text-xs font-medium tracking-wider text-gray-600 uppercase"
          style={{ width: 40 }}
        />
        <th
          className="cursor-pointer py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-600 uppercase transition-colors select-none hover:text-gray-900"
          onClick={() => onSort('name')}
        >
          Strategy
          <SortIcon active={sortKey === 'name'} dir={sortDir} />
        </th>
        <th className={thClass} onClick={() => onSort('generationCount')}>
          Gens
          <SortIcon active={sortKey === 'generationCount'} dir={sortDir} />
        </th>
        <th className={thClass} onClick={() => onSort('sceneGoodPct')}>
          Scene
          <SortIcon
            active={sortKey === 'sceneGoodPct' || sortKey === 'sceneFailedPct'}
            dir={sortDir}
          />
        </th>
        <th className={thClass} onClick={() => onSort('productGoodPct')}>
          Product
          <SortIcon
            active={sortKey === 'productGoodPct' || sortKey === 'productFailedPct'}
            dir={sortDir}
          />
        </th>
        <th className={thClass} onClick={() => onSort('notRatedCount')}>
          Unrated
          <SortIcon active={sortKey === 'notRatedCount'} dir={sortDir} />
        </th>
        <th className={thClass} onClick={() => onSort('avgExecTimeMs')}>
          Avg time
          <SortIcon active={sortKey === 'avgExecTimeMs'} dir={sortDir} />
        </th>
      </tr>
    </thead>
  );
}
