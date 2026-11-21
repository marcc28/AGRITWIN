import {
  CALENDAR_PHONE,
  DASHBOARD_PHONE,
  getPageFrame,
  PROFILE_PHONE,
} from '../../../src/styles/responsive';

describe('getPageFrame', () => {
  it('keeps the phone width and margin of each page', () => {
    expect(getPageFrame(390, 844, PROFILE_PHONE)).toEqual({
      maxWidth: 360,
      horizontalInset: 16,
    });
    expect(getPageFrame(390, 844, DASHBOARD_PHONE)).toEqual({
      maxWidth: 420,
      horizontalInset: 20,
    });
    expect(getPageFrame(390, 844, CALENDAR_PHONE)).toEqual({
      maxWidth: 440,
      horizontalInset: 18,
    });
  });

  it('tightens the margin on a narrow phone', () => {
    expect(getPageFrame(320, 700, DASHBOARD_PHONE)).toEqual({
      maxWidth: 420,
      horizontalInset: 12,
    });
  });

  it('grows the column from tablet to a wide desktop', () => {
    expect(getPageFrame(768, 1024, PROFILE_PHONE)).toEqual({
      maxWidth: 720,
      horizontalInset: 24,
    });
    expect(getPageFrame(1280, 800, DASHBOARD_PHONE)).toEqual({
      maxWidth: 880,
      horizontalInset: 24,
    });
    expect(getPageFrame(1800, 1000, CALENDAR_PHONE)).toEqual({
      maxWidth: 1040,
      horizontalInset: 24,
    });
  });

  it('tightens the margin on a short landscape screen', () => {
    expect(getPageFrame(800, 400, CALENDAR_PHONE)).toEqual({
      maxWidth: 720,
      horizontalInset: 12,
    });
  });
});
