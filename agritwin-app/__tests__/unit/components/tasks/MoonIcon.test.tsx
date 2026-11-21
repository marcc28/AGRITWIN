import { render, screen } from '@testing-library/react-native';

import { MoonIcon } from '@/components/tasks/MoonIcon';
import { MOON_PHASES, type MoonPhase } from '@/utils/moon';

type Node = {
  props: { style: Record<string, unknown> };
  children?: Node[];
};

function moon(phase: MoonPhase, size?: number) {
  render(<MoonIcon phase={phase} size={size} testID="moon" label={phase} />);
  return screen.toJSON() as unknown as Node;
}

describe('MoonIcon', () => {
  it('draws something for each of the eight phases', () => {
    for (const phase of MOON_PHASES) {
      const { unmount } = render(<MoonIcon phase={phase} testID="moon" />);
      expect(screen.getByTestId('moon')).toBeTruthy();
      unmount();
    }
  });

  it('is a round shape of the size it is given', () => {
    const node = moon('full', 12);

    expect(node.props.style).toMatchObject({
      width: 12,
      height: 12,
      borderRadius: 6,
    });
  });

  it('has a default size and is not read aloud without a label', () => {
    render(<MoonIcon phase="new" testID="plain" />);

    expect(screen.getByTestId('plain').props.style).toMatchObject({
      width: 10,
    });
    expect(screen.getByTestId('plain').props.accessible).toBe(false);
  });

  it('can be read aloud with a label', () => {
    moon('full');

    expect(screen.getByTestId('moon').props.accessibilityLabel).toBe('full');
    expect(screen.getByTestId('moon').props.accessible).toBe(true);
  });

  it('shows an empty circle for the new moon and a full one for the full moon', () => {
    const empty = moon('new');
    expect(empty.children).toBeFalsy();
    expect(empty.props.style.backgroundColor).toBe('#FFFFFF');
  });

  it('fills the whole circle for the full moon', () => {
    const full = moon('full');

    expect(full.children).toBeFalsy();
    expect(full.props.style.backgroundColor).not.toBe('#FFFFFF');
  });

  it('lights the right half when it grows and the left half when it shrinks', () => {
    const growing = moon('firstQuarter');
    expect(growing.children?.[0].props.style).toMatchObject({ right: 0 });
    expect(growing.children?.[0].props.style).not.toHaveProperty('left');
  });

  it('lights the left half at the last quarter', () => {
    const shrinking = moon('lastQuarter');

    expect(shrinking.children?.[0].props.style).toMatchObject({ left: 0 });
    expect(shrinking.children?.[0].props.style).not.toHaveProperty('right');
  });

  it('hides part of a lit disc for the crescents, on opposite sides', () => {
    const waxing = moon('waxingCrescent', 12);
    const waxingLeft = waxing.children?.[0].props.style.left as number;
    expect(waxing.children?.[0].props.style.backgroundColor).toBe('#FFFFFF');
    expect(waxingLeft).toBeLessThan(0);
  });

  it('moves the hiding disc to the other side when the crescent shrinks', () => {
    const waning = moon('waningCrescent', 12);

    expect(waning.children?.[0].props.style.left as number).toBeGreaterThan(0);
  });

  it('puts a lit disc on a white one for the gibbous moons, on opposite sides', () => {
    const waxing = moon('waxingGibbous', 12);
    expect(waxing.props.style.backgroundColor).toBe('#FFFFFF');
    expect(waxing.children?.[0].props.style.backgroundColor).not.toBe(
      '#FFFFFF',
    );
    expect(waxing.children?.[0].props.style.left as number).toBeGreaterThan(0);
  });

  it('moves the lit disc to the left when the gibbous moon shrinks', () => {
    const waning = moon('waningGibbous', 12);

    expect(waning.children?.[0].props.style.left as number).toBeLessThan(0);
  });
});
