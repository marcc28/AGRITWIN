import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FIELD_TYPES, SOIL_TYPES } from '../constants/fieldOptions';
import { styles } from '../styles/field-option-chips.styles';
import { OptionChip } from './OptionChip';

export function FieldOptionChips({
  fieldType,
  soilType,
  onFieldType,
  onSoilType,
  disabled,
}: Readonly<{
  fieldType: string;
  soilType: string;
  onFieldType: (value: string) => void;
  onSoilType: (value: string) => void;
  disabled: boolean;
}>) {
  const { t } = useTranslation();

  return (
    <>
      <Text style={styles.label}>{t('settings.type')}</Text>
      <View style={styles.chipRow}>
        {FIELD_TYPES.map((type) => (
          <OptionChip
            key={type}
            label={t(`settings.fieldTypes.${type}`)}
            selected={fieldType === type}
            onPress={() => onFieldType(type)}
            disabled={disabled}
            style={styles.chip}
            selectedStyle={styles.chipSelected}
            textStyle={styles.chipText}
            selectedTextStyle={styles.chipTextSelected}
          />
        ))}
      </View>

      <Text style={styles.label}>{t('settings.soil')}</Text>
      <View style={styles.chipRow}>
        {SOIL_TYPES.map((type) => (
          <OptionChip
            key={type}
            label={t(`settings.soilTypes.${type}`)}
            selected={soilType === type}
            onPress={() => onSoilType(type)}
            disabled={disabled}
            style={styles.chip}
            selectedStyle={styles.chipSelected}
            textStyle={styles.chipText}
            selectedTextStyle={styles.chipTextSelected}
          />
        ))}
      </View>
    </>
  );
}
