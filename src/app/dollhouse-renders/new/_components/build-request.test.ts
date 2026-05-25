import { describe, expect, it } from 'vitest';
import {
  buildImageConfig,
  DEFAULT_IMAGE_CONFIG,
  FORMAT_OPTIONS,
  parseDesignMaterialsOverride,
  parseRoomDataOverride,
} from './build-request';

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

describe('parseDesignMaterialsOverride', () => {
  it('treats empty input as not-provided so the project value wins', () => {
    expect(parseDesignMaterialsOverride('')).toEqual({
      provided: false,
      value: null,
      error: null,
    });
    expect(parseDesignMaterialsOverride('   \n  ')).toEqual({
      provided: false,
      value: null,
      error: null,
    });
  });

  it('reports invalid JSON with the parser error', () => {
    const result = parseDesignMaterialsOverride('{not json');
    expect(result.provided).toBe(true);
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('rejects non-object JSON', () => {
    expect(parseDesignMaterialsOverride('[]').error).toMatch(/object/i);
    expect(parseDesignMaterialsOverride('"hi"').error).toMatch(/object/i);
  });

  it('requires id/objects/surfaces shape', () => {
    expect(parseDesignMaterialsOverride('{}').error).toMatch(/id/);
    expect(parseDesignMaterialsOverride('{"id":"d1"}').error).toMatch(/objects/);
    expect(parseDesignMaterialsOverride('{"id":"d1","objects":{}}').error).toMatch(/surfaces/);
  });

  it('returns the typed payload when valid', () => {
    const json = JSON.stringify({ id: 'd1', objects: { foo: 1 }, surfaces: { bar: 2 } });
    const result = parseDesignMaterialsOverride(json);
    expect(result).toEqual({
      provided: true,
      value: { id: 'd1', objects: { foo: 1 }, surfaces: { bar: 2 } },
      error: null,
    });
  });
});

describe('parseRoomDataOverride', () => {
  it('treats empty input as not-provided', () => {
    expect(parseRoomDataOverride('')).toEqual({
      provided: false,
      value: null,
      error: null,
    });
  });

  it('accepts any JSON object', () => {
    const result = parseRoomDataOverride('{"walls":[],"floor":{}}');
    expect(result.provided).toBe(true);
    expect(result.value).toEqual({ walls: [], floor: {} });
    expect(result.error).toBeNull();
  });

  it('rejects arrays and primitives', () => {
    expect(parseRoomDataOverride('[]').error).toMatch(/object/i);
    expect(parseRoomDataOverride('42').error).toMatch(/object/i);
  });
});
