import { describe, expect, it } from 'vitest';
import { buildImageConfig, DEFAULT_IMAGE_CONFIG, FORMAT_OPTIONS } from './build-request';

describe('dollhouse render image config defaults', () => {
  it('matches the proven 4:3 dollhouse-capture defaults', () => {
    expect(DEFAULT_IMAGE_CONFIG).toEqual({
      format: 'Png',
      width: '1920',
      height: '1440',
      superSamplingMultiplier: '',
    });
    expect(buildImageConfig(DEFAULT_IMAGE_CONFIG)).toEqual({
      format: 'Png',
      width: 1920,
      height: 1440,
    });
  });

  it('falls back to the service defaults when dimensions are invalid', () => {
    expect(
      buildImageConfig({
        ...DEFAULT_IMAGE_CONFIG,
        width: '0',
        height: 'not-a-number',
      }),
    ).toEqual({
      format: 'Png',
      width: 1920,
      height: 1440,
    });
  });

  it('puts PNG first in the format picker', () => {
    expect(FORMAT_OPTIONS[0]).toEqual({ value: 'Png', label: 'PNG' });
  });
});
