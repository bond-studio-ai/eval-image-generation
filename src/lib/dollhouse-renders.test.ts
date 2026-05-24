import { describe, expect, it } from 'vitest';
import { cameraFrameKey, normalizeCameraFrame, sanitizeRoomData } from './dollhouse-renders';

describe('sanitizeRoomData', () => {
  it('returns null for non-object input', () => {
    expect(sanitizeRoomData(null)).toBeNull();
    expect(sanitizeRoomData(undefined)).toBeNull();
    expect(sanitizeRoomData('scan')).toBeNull();
    expect(sanitizeRoomData([])).toBeNull();
  });

  it('strips top-level keys outside the v2 whitelist', () => {
    const out = sanitizeRoomData({
      layoutType: 'bathroom',
      scannedDate: 12345,
      unknownTopLevel: 'should-be-stripped',
      version: 7,
    });
    expect(out).toEqual({
      layoutType: 'bathroom',
      scannedDate: 12345,
    });
  });

  it('strips unknown keys from entities in array categories', () => {
    const out = sanitizeRoomData({
      tubFillers: [
        {
          identifier: 'tf-1',
          parentIdentifier: 'floor-1',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          shortName: null,
          // upstream-only fields that trip the strict schema:
          fixture: 'right',
          mountingPosition: 'Floor',
          tubIdentifier: 'tub-9',
        },
      ],
    });
    expect(out?.tubFillers).toEqual([
      {
        identifier: 'tf-1',
        parentIdentifier: 'floor-1',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        shortName: null,
      },
    ]);
  });

  it('sanitizes areas.showers entries with the same entity whitelist', () => {
    const out = sanitizeRoomData({
      areas: {
        showers: [
          {
            identifier: 'shower-1',
            curbHeight: 0.1,
            curbThickness: 0.1,
            shape: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
            ],
            unknownField: 'gone',
          },
        ],
        unknownAreaCategory: ['should be stripped'],
      },
    });
    expect(out?.areas).toEqual({
      showers: [
        {
          identifier: 'shower-1',
          curbHeight: 0.1,
          curbThickness: 0.1,
          shape: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    });
  });

  it('resolves the identifier/id mutual exclusion in favor of identifier', () => {
    const out = sanitizeRoomData({
      doors: [
        {
          identifier: 'd-1',
          id: 'should-be-removed',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
    });
    expect(out?.doors).toEqual([
      {
        identifier: 'd-1',
        position: { x: 0, y: 0, z: 0 },
      },
    ]);
  });

  it('handles empty arrays and missing categories', () => {
    const out = sanitizeRoomData({ cabinets: [], ceilings: [] });
    expect(out).toEqual({ cabinets: [], ceilings: [] });
  });
});

describe('normalizeCameraFrame', () => {
  it('returns null when position or rotation is missing', () => {
    expect(
      normalizeCameraFrame({ aspect: 1, fov: 60, priority: 1, summary: '', products: [] }),
    ).toBeNull();
    expect(
      normalizeCameraFrame({
        aspect: 1,
        fov: 60,
        priority: 1,
        summary: '',
        products: [],
        position: { x: 0, y: 0, z: 0 },
      }),
    ).toBeNull();
  });

  it('coerces numeric defaults and trims products to fully-populated entries', () => {
    const out = normalizeCameraFrame({
      aspect: 1.333,
      fov: 60,
      priority: 2,
      summary: 'Shower Area',
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      products: [
        { id: 'p1', category: 'Vanity', view: 'Front' },
        // missing view → dropped
        { id: 'p2', category: 'Tub' },
        // bare-id string form is unsupported by upstream → dropped
        'p3',
      ],
    });
    expect(out).toEqual({
      aspect: 1.333,
      fov: 60,
      priority: 2,
      summary: 'Shower Area',
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      products: [{ id: 'p1', category: 'Vanity', view: 'Front' }],
    });
  });

  it('defaults non-numeric aspect/fov/priority to 0 rather than dropping the frame', () => {
    const out = normalizeCameraFrame({
      aspect: 'not a number',
      fov: undefined,
      priority: null,
      summary: 42, // wrong type → empty string
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: [],
    });
    expect(out).toEqual({
      aspect: 0,
      fov: 0,
      priority: 0,
      summary: '',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: [],
    });
  });
});

describe('cameraFrameKey', () => {
  it('always includes the array index so duplicate (priority, summary) pairs stay distinct', () => {
    const a = {
      aspect: 1,
      fov: 60,
      priority: 1,
      summary: 'Vanity',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: [],
    };
    expect(cameraFrameKey(a, 0)).not.toBe(cameraFrameKey(a, 1));
  });

  it('handles empty summaries without colliding on priority alone', () => {
    const a = {
      aspect: 1,
      fov: 60,
      priority: 5,
      summary: '',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: [],
    };
    expect(cameraFrameKey(a, 0)).toBe('0|p5|');
    expect(cameraFrameKey(a, 1)).toBe('1|p5|');
  });
});
