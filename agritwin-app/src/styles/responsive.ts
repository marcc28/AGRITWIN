/**
 * Width and side margin for a one-column page: profile, dashboard, calendar.
 *
 * The cuts match the market. Under 360 the margin tightens. From 600, 1024
 * and 1600 the column grows. A short landscape screen (wider than it is tall,
 * and under 600 tall) also tightens the margin. On a normal phone the page
 * keeps the width and margin it already had.
 */
export type PagePhoneFrame = {
  maxWidth: number;
  horizontalInset: number;
};

export type PageFrame = {
  maxWidth: number;
  horizontalInset: number;
};

export const PROFILE_PHONE: PagePhoneFrame = {
  maxWidth: 360,
  horizontalInset: 16,
};

export const DASHBOARD_PHONE: PagePhoneFrame = {
  maxWidth: 420,
  horizontalInset: 20,
};

export const CALENDAR_PHONE: PagePhoneFrame = {
  maxWidth: 440,
  horizontalInset: 18,
};

const NARROW = 360;
const TABLET = 600;
const DESKTOP = 1024;
const WIDE = 1600;

const NARROW_INSET = 12;
const TABLET_INSET = 24;
const TABLET_MAX = 720;
const DESKTOP_MAX = 880;
const WIDE_MAX = 1040;

export function getPageFrame(
  width: number,
  height: number,
  phone: PagePhoneFrame,
): PageFrame {
  const compactLandscape = width > height && height < TABLET;

  let maxWidth = phone.maxWidth;
  if (width >= WIDE) {
    maxWidth = WIDE_MAX;
  } else if (width >= DESKTOP) {
    maxWidth = DESKTOP_MAX;
  } else if (width >= TABLET) {
    maxWidth = TABLET_MAX;
  }

  let horizontalInset = phone.horizontalInset;
  if (width < NARROW || compactLandscape) {
    horizontalInset = NARROW_INSET;
  } else if (width >= TABLET) {
    horizontalInset = TABLET_INSET;
  }

  return { maxWidth, horizontalInset };
}
