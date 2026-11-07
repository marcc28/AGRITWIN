import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import DateTimePicker from '@expo/ui/datetimepicker';

import { DateField } from '@/components/DateField';

jest.mock('@expo/ui/datetimepicker', () => jest.fn(() => null));

const picker = DateTimePicker as jest.Mock;
const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);

function setPlatform(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

afterEach(() => {
  jest.clearAllMocks();
  if (originalPlatformDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
  }
});

describe('DateField', () => {
  it('renders an accessible web date input with bounds and forwards changes', () => {
    setPlatform('web');
    const onChange = jest.fn();
    render(
      <DateField
        value="2026-01-10"
        onChange={onChange}
        placeholder="Plantat el"
        minimumDate="2026-01-01"
        maximumDate="2026-12-31"
      />,
    );
    const input = screen.getByLabelText('Plantat el');
    expect(input.props).toMatchObject({
      type: 'date',
      value: '2026-01-10',
      min: '2026-01-01',
      max: '2026-12-31',
    });
    input.props.onChange({ currentTarget: { value: '2026-02-03' } });
    expect(onChange).toHaveBeenCalledWith('2026-02-03');
  });

  it('renders a disabled web input with no optional date bounds', () => {
    setPlatform('web');
    render(
      <DateField
        value=""
        onChange={jest.fn()}
        placeholder="Harvest"
        disabled
      />,
    );
    expect(screen.getByLabelText('Harvest').props).toMatchObject({
      disabled: true,
      min: undefined,
      max: undefined,
    });
  });

  it('lets iOS users stage a date, cancel, or confirm it', () => {
    setPlatform('ios');
    const onChange = jest.fn();
    render(
      <DateField
        value="invalid"
        onChange={onChange}
        placeholder="Plantat el"
        minimumDate="bad"
        maximumDate="2026-12-31"
      />,
    );
    expect(screen.getByText('Plantat el')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Plantat el' }));
    const props = picker.mock.calls[picker.mock.calls.length - 1][0];
    expect(props).toMatchObject({
      mode: 'date',
      display: 'spinner',
      minimumDate: undefined,
      maximumDate: expect.any(Date),
    });
    act(() => props.onValueChange({}, null));
    act(() => props.onValueChange({}, new Date(2026, 1, 3)));
    fireEvent.press(screen.getByText('Cancel·lar'));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Plantat el' }));
    const reopenedProps = picker.mock.calls[picker.mock.calls.length - 1][0];
    act(() => reopenedProps.onValueChange({}, new Date(2026, 1, 3)));
    fireEvent.press(screen.getByText('Fet'));
    expect(onChange).toHaveBeenCalledWith('2026-02-03');
  });

  it('confirms Android dialog selections immediately and dismisses safely', () => {
    setPlatform('android');
    const onChange = jest.fn();
    render(
      <DateField
        value="2026-03-04"
        onChange={onChange}
        placeholder="Plantat el"
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: /2026|març|March/i }));
    let props = picker.mock.calls[picker.mock.calls.length - 1][0];
    expect(props).toMatchObject({
      presentation: 'dialog',
      positiveButton: { label: 'Fet' },
      negativeButton: { label: 'Cancel·lar' },
    });
    act(() => {
      props.onValueChange({}, null);
      props.onDismiss();
    });

    fireEvent.press(screen.getByRole('button', { name: /2026|març|March/i }));
    props = picker.mock.calls[picker.mock.calls.length - 1][0];
    act(() => props.onValueChange({}, new Date(2026, 4, 6)));
    expect(onChange).toHaveBeenCalledWith('2026-05-06');
  });

  it('uses the placeholder and current date when the native value is empty', () => {
    setPlatform('android');
    render(<DateField value="" onChange={jest.fn()} placeholder="Harvest" />);
    fireEvent.press(screen.getByRole('button', { name: 'Harvest' }));
    const props = picker.mock.calls[picker.mock.calls.length - 1][0];
    expect(props.value).toBeInstanceOf(Date);
    expect(screen.getByText('Harvest')).toBeTruthy();
  });

  it('keeps the native picker closed when the control is disabled', () => {
    setPlatform('android');
    render(
      <DateField
        value="2026-03-04"
        onChange={jest.fn()}
        placeholder="Plantat el"
        disabled
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: /2026|març|March/i }));
    expect(picker).not.toHaveBeenCalled();
  });
});
