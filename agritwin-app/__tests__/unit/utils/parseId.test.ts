import { parseId } from '../../../src/utils/parseId';

describe('parseId', () => {
  it('reads a number from a string or list', () => {
    expect(parseId('3')).toBe(3);
    expect(parseId(['4'])).toBe(4);
    expect(parseId(undefined)).toBeNaN();
  });
});
