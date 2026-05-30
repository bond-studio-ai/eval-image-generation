'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangleIcon } from '@/components/ui/icons';

export function BatchErrorCard({
  error,
  onRetry,
  retrying = false,
}: {
  error: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="rounded-card border-warning-200 bg-warning-50 flex items-start gap-3 border p-4">
      <AlertTriangleIcon className="text-warning-600 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-body text-warning-800">{error}</p>
        <p className="text-caption text-warning-700 mt-1">
          Ensure BASE_API_HOSTNAME points to the image-generation backend.
        </p>
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
