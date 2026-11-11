import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FieldBoundaryPicker } from '../../../src/components/FieldBoundaryPicker';
const outer = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 0.001 },
  { lat: 0.001, lon: 0.001 },
  { lat: 0.001, lon: 0 },
];
const hole = [
  { lat: 0.0002, lon: 0.0002 },
  { lat: 0.0002, lon: 0.0004 },
  { lat: 0.0004, lon: 0.0004 },
  { lat: 0.0004, lon: 0.0002 },
];
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../src/components/field-location/MapCanvas', () => {
  const { Text, Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return function MockMap({
    excludedZones = [],
    activeZone = null,
    readOnly,
    onBoundaryChange,
  }: {
    excludedZones?: { lat: number; lon: number }[][];
    activeZone?: number | null;
    readOnly?: boolean;
    onBoundaryChange: (p: { lat: number; lon: number }[]) => void;
  }) {
    const points = [
      { lat: 0.0002, lon: 0.0002 },
      { lat: 0.0002, lon: 0.0004 },
      { lat: 0.0004, lon: 0.0004 },
      { lat: 0.0004, lon: 0.0002 },
    ];
    return (
      <Pressable
        disabled={readOnly}
        onPress={() => {
          if (activeZone !== null)
            onBoundaryChange([
              ...(excludedZones[activeZone] ?? []),
              points[(excludedZones[activeZone]?.length ?? 0) % 4],
            ]);
        }}
      >
        <Text>Add exclusion point</Text>
      </Pressable>
    );
  };
});
describe('Boundary picker exclusions', () => {
  it('adds and confirms an interior excluded zone', () => {
    const confirm = jest.fn();
    render(
      <FieldBoundaryPicker
        initialPoint={null}
        initialBoundary={outer}
        unit="m2"
        onConfirm={confirm}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(
      screen.getByText('settings.createField.boundary.addExclusion'),
    );
    expect(
      screen.getByText('settings.createField.boundary.confirm'),
    ).toBeDisabled();
    for (let i = 0; i < 4; i++)
      fireEvent.press(screen.getByText('Add exclusion point'));
    fireEvent.press(screen.getByText('settings.createField.boundary.confirm'));
    expect(confirm).toHaveBeenCalledWith(outer, [hole]);
  });
  it('prevents saving an excluded zone that touches the outer boundary', () => {
    render(
      <FieldBoundaryPicker
        initialPoint={null}
        initialBoundary={outer}
        initialExcludedZones={[[outer[0], ...hole.slice(1)]]}
        unit="m2"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(
      screen.getByText('settings.createField.boundary.errors.outside'),
    ).toBeTruthy();
    expect(
      screen.getByText('settings.createField.boundary.confirm'),
    ).toBeDisabled();
  });
  it('keeps viewing a field read-only', () => {
    const confirm = jest.fn();
    render(
      <FieldBoundaryPicker
        initialPoint={null}
        initialBoundary={outer}
        initialExcludedZones={[hole]}
        unit="ha"
        readOnly
        onConfirm={confirm}
        onCancel={jest.fn()}
      />,
    );
    expect(
      screen.queryByText('settings.createField.boundary.addExclusion'),
    ).toBeNull();
    expect(
      screen.queryByText('settings.createField.boundary.confirm'),
    ).toBeNull();
    fireEvent.press(screen.getByText('Add exclusion point'));
    expect(confirm).not.toHaveBeenCalled();
  });
});
