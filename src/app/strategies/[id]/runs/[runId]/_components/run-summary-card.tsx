import { AlertCircleIcon, ClockIcon, RefreshIcon, StarIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import { ConfigTag, SourceBadge, StatusBadge } from './shared';
import type { RunData } from './types';

export function RunSummaryCard({
  data,
  duration,
  stepCount,
  generationCount,
  hasOutput,
  hasConfig,
  markingStatus,
  retrying,
  onMarkStatus,
  onRetry,
  onShowJudgeModal,
}: {
  data: RunData;
  duration: number | null;
  stepCount: number;
  generationCount: number;
  hasOutput: boolean;
  hasConfig: boolean;
  markingStatus: 'idle' | 'failed' | 'completed';
  retrying: boolean;
  onMarkStatus: (status: 'failed' | 'completed') => void;
  onRetry: () => void;
  onShowJudgeModal: () => void;
}) {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Status + source */}
        <div className="flex items-center gap-2">
          <StatusBadge status={data.status} />
          <SourceBadge source={data.source} />
        </div>

        {/* Timing */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Created {new Date(data.createdAt).toLocaleString()}</span>
          {duration != null && (
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              {duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
            </span>
          )}
          <span>
            {stepCount} {stepCount === 1 ? 'step' : 'steps'} · {generationCount}{' '}
            {generationCount === 1 ? 'generation' : 'generations'}
          </span>
        </div>

        {/* Judge score */}
        {data.judgeScore != null && data.judgeScore > 0 && (
          <button
            type="button"
            onClick={onShowJudgeModal}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${data.isJudgeSelected ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {data.isJudgeSelected && <StarIcon className="size-3.5" fill="currentColor" />}
            Score: {data.judgeScore}
          </button>
        )}
        {(data.judgeScore === 0 ||
          (data.strategy.hasJudge &&
            data.status === 'completed' &&
            hasOutput &&
            data.judgeScore == null)) && (
          <button
            type="button"
            onClick={onShowJudgeModal}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200"
          >
            <AlertCircleIcon className="size-3.5" />
            Judge failed
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {data.status !== 'failed' && data.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => onMarkStatus('failed')}
              disabled={markingStatus !== 'idle'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {markingStatus === 'failed' && <Spinner className="size-3.5" />}
              Mark failed
            </button>
          )}
          {(data.status === 'failed' || data.status === 'skipped') && (
            <>
              <button
                type="button"
                onClick={() => onMarkStatus('completed')}
                disabled={markingStatus !== 'idle'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                {markingStatus === 'completed' && <Spinner className="size-3.5" />}
                Mark completed
              </button>
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                {retrying ? <Spinner className="size-3.5" /> : <RefreshIcon className="size-3.5" />}
                Retry
              </button>
            </>
          )}
        </div>
      </div>

      {hasConfig && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {data.strategy.model != null && <ConfigTag label="Model" value={data.strategy.model} />}
          {data.strategy.aspectRatio != null && (
            <ConfigTag label="Aspect" value={data.strategy.aspectRatio} />
          )}
          {data.strategy.outputResolution != null && (
            <ConfigTag label="Resolution" value={data.strategy.outputResolution} />
          )}
          {data.strategy.temperature != null && (
            <ConfigTag label="Temp" value={String(data.strategy.temperature)} />
          )}
          {data.strategy.tagImages != null && (
            <ConfigTag label="Tag images" value={data.strategy.tagImages ? 'Yes' : 'No'} />
          )}
          {data.strategy.useGoogleSearch != null && (
            <ConfigTag label="Google Search" value={data.strategy.useGoogleSearch ? 'Yes' : 'No'} />
          )}
        </div>
      )}
    </div>
  );
}
