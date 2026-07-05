const { calculateHaversineDistance } = require('./delivery.service');

describe('calculateHaversineDistance', () => {
  test('returns 0 for identical coordinates', () => {
    expect(calculateHaversineDistance(12.3714, -1.5197, 12.3714, -1.5197)).toBe(0);
  });

  test('returns the known distance between Ouagadougou and Bobo-Dioulasso', () => {
    const distance = calculateHaversineDistance(12.3714, -1.5197, 11.1771, -4.2979);
    expect(distance).toBeCloseTo(330.29, 1);
  });

  test('returns null when a coordinate is missing', () => {
    expect(calculateHaversineDistance(undefined, -1.5197, 11.1771, -4.2979)).toBeNull();
    expect(calculateHaversineDistance(12.3714, -1.5197, undefined, -4.2979)).toBeNull();
  });
});
