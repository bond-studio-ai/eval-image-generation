import { CheckIcon, SearchIcon } from '@/components/ui/icons';

export interface SelectableItem {
  id: string;
  label: string;
}

interface MultiSelectColumnProps {
  title: string;
  selectedCount: number;
  onClear: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  items: SelectableItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
}

export function MultiSelectColumn({
  title,
  selectedCount,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  items,
  selectedIds,
  onToggle,
  emptyMessage,
}: MultiSelectColumnProps) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
            {title}
            {selectedCount > 0 && (
              <span className="bg-primary-100 text-primary-700 ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {selectedCount}
              </span>
            )}
          </p>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] font-medium text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative mt-2">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="focus:border-primary-400 focus:ring-primary-400 w-full rounded-md border border-gray-200 bg-white py-1.5 pr-3 pl-8 text-xs placeholder:text-gray-400 focus:ring-1 focus:outline-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">{emptyMessage}</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                    selected
                      ? 'border-primary-400 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      selected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selected && <CheckIcon className="size-3" />}
                  </span>
                  <span className="truncate font-medium text-gray-900">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
