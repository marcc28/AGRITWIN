import { fireEvent, render, screen } from '@testing-library/react-native';

import { FieldDevicesSection } from '@/components/FieldDevicesSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const devices = [
  { id: 'dev-1', battery_status: true, brand: 'AgriTwin', serial_number: 'S1' },
  { id: 'dev-2', battery_status: false },
];

describe('FieldDevicesSection', () => {
  it('lists the devices, with a button to remove each one', () => {
    const onRemove = jest.fn();
    render(
      <FieldDevicesSection
        devices={devices}
        addLabel="Add"
        disabled={false}
        onAdd={jest.fn()}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('addDevice.section.title')).toBeTruthy();
    expect(screen.getByText('dev-1')).toBeTruthy();
    expect(screen.getByText('AgriTwin · S1')).toBeTruthy();
    expect(screen.getByText('dev-2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('remove-device-dev-2'));
    expect(onRemove).toHaveBeenCalledWith('dev-2');
  });

  it('says when there are no devices', () => {
    render(
      <FieldDevicesSection
        devices={[]}
        addLabel="Add"
        disabled={false}
        onAdd={jest.fn()}
      />,
    );

    expect(screen.getByTestId('field-devices-section-empty')).toBeTruthy();
    expect(screen.getByText('addDevice.section.none')).toBeTruthy();
  });

  it('shows no list while the field is being created', () => {
    render(
      <FieldDevicesSection
        hint="Link your boards"
        addLabel="Save and add"
        disabled={false}
        plain
        onAdd={jest.fn()}
      />,
    );

    expect(screen.getByText('Link your boards')).toBeTruthy();
    expect(screen.queryByTestId('field-devices-section-empty')).toBeNull();
  });

  it('starts the add flow with the button', () => {
    const onAdd = jest.fn();
    render(
      <FieldDevicesSection
        devices={[]}
        addLabel="Add device"
        disabled={false}
        onAdd={onAdd}
      />,
    );

    fireEvent.press(screen.getByTestId('field-devices-add'));

    expect(screen.getByText('Add device')).toBeTruthy();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('blocks the buttons while the screen is saving', () => {
    const onAdd = jest.fn();
    render(
      <FieldDevicesSection
        devices={devices}
        addLabel="Add"
        disabled
        onAdd={onAdd}
        onRemove={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('field-devices-add').props.accessibilityState,
    ).toEqual({ disabled: true });
    fireEvent.press(screen.getByTestId('field-devices-add'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('has no add button when adding is not possible', () => {
    render(
      <FieldDevicesSection devices={[]} addLabel="Add" disabled={false} />,
    );

    expect(screen.queryByTestId('field-devices-add')).toBeNull();
  });

  it('ignores a remove tap when nobody listens', () => {
    render(
      <FieldDevicesSection devices={devices} addLabel="Add" disabled={false} />,
    );

    expect(() =>
      fireEvent.press(screen.getByTestId('remove-device-dev-1')),
    ).not.toThrow();
  });

  it('shows how many devices are linked', () => {
    const { rerender } = render(
      <FieldDevicesSection devices={devices} addLabel="Add" disabled={false} />,
    );

    expect(screen.getByTestId('field-devices-count')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();

    rerender(
      <FieldDevicesSection devices={[]} addLabel="Add" disabled={false} />,
    );
    expect(screen.queryByTestId('field-devices-count')).toBeNull();

    rerender(<FieldDevicesSection addLabel="Add" disabled={false} />);
    expect(screen.queryByTestId('field-devices-count')).toBeNull();
  });

  it('shows each device as a card with its connection state', () => {
    render(
      <FieldDevicesSection devices={devices} addLabel="Add" disabled={false} />,
    );

    expect(screen.getByTestId('device-dev-1')).toBeTruthy();
    expect(screen.getByTestId('device-dev-2')).toBeTruthy();
    expect(screen.getByTestId('device-status-dev-1').props.children).toBe(
      'settings.fieldDetail.connected',
    );
    expect(screen.getByTestId('device-status-dev-2').props.children).toBe(
      'settings.fieldDetail.disconnected',
    );
  });

  it('shows a friendly empty box when there are no devices', () => {
    render(
      <FieldDevicesSection devices={[]} addLabel="Add" disabled={false} />,
    );

    expect(screen.getByTestId('field-devices-section-empty')).toBeTruthy();
    expect(screen.getByText('addDevice.section.none')).toBeTruthy();
    expect(screen.queryByTestId(/^device-dev/)).toBeNull();
  });
});
