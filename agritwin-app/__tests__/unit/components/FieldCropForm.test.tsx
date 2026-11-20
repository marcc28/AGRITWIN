import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FieldCropForm } from '@/components/FieldCropForm';
import { getEditCropsStyles } from '@/styles/edit-crops.styles';
import type { Crop } from '@/services/api_crops';
import type { FieldCrop } from '@/services/api_fieldCrops';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/DateField', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { TextInput } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    DateField: (props: { value: string; onChange: (value: string) => void }) =>
      React.createElement(TextInput, {
        value: props.value,
        onChangeText: props.onChange,
      }),
  };
});

const crops: Crop[] = [
  { id: 1, name: 'Tomàquet' } as Crop,
  { id: 2, name: 'Ceba' } as Crop,
];
const existing: FieldCrop[] = [{ crop_id: 2 } as FieldCrop];

function Harness({ show = true }: { show?: boolean }) {
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [visible, setVisible] = useState(show);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [plantedAt, setPlantedAt] = useState('');
  const [harvestAt, setHarvestAt] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <FieldCropForm
      styles={getEditCropsStyles(390, 844)}
      availableCrops={crops}
      existingCrops={existing}
      loadingCrops={false}
      saving={false}
      addingCrop={false}
      showCropForm={visible}
      setShowCropForm={setVisible}
      cropSelectorOpen={selectorOpen}
      setCropSelectorOpen={setSelectorOpen}
      selectedCropId={selectedId}
      setSelectedCropId={setSelectedId}
      selectedCropName={selectedName}
      setSelectedCropName={setSelectedName}
      plantedAt={plantedAt}
      setPlantedAt={setPlantedAt}
      expectedHarvestAt={harvestAt}
      setExpectedHarvestAt={setHarvestAt}
      cropNotes={notes}
      setCropNotes={setNotes}
      onLoadMore={jest.fn()}
      onAdd={jest.fn()}
      onShowCropForm={jest.fn()}
    />
  );
}

describe('FieldCropForm', () => {
  it('filters crops already planted in the field and selects from the modal', () => {
    render(<Harness />);
    expect(screen.queryByText('Ceba')).toBeNull();
    fireEvent.press(screen.getByRole('button'));
    fireEvent.press(screen.getByText('Tomàquet'));
    expect(screen.getByText('Tomàquet')).toBeTruthy();
    expect(
      screen.getByText('settings.manageCrops.saveCrop').parent,
    ).toBeTruthy();
  });

  it('shows the add button when the form is collapsed', () => {
    render(<Harness show={false} />);
    expect(screen.getByText('settings.manageCrops.addCrop')).toBeTruthy();
  });
});
