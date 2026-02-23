import type { MatrixRunGeneration } from '@/hooks/matrix/strategy-matrix-types';

export type EnlargedCell = {
  presetName: string;
  strategyName: string;
  generations: MatrixRunGeneration[];
};
