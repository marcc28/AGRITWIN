import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';

import { getFields, updateField } from '../services/api';
import { styles } from '../styles/edit-field.styles';

const FIELD_TYPES = ['home_garden', 'open_field', 'greenhouse'] as const;
const SOIL_TYPES = ['loam', 'clay', 'sandy'] as const;

export default function EditFieldScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const fieldId = Number(idValue);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>(FIELD_TYPES[0]);
  const [soilType, setSoilType] = useState<string>(SOIL_TYPES[0]);
  const [sizeM2, setSizeM2] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadField() {
      try {
        const list = await getFields();
        const field = list.find((item) => item.id === fieldId);

        if (!field) {
          setErrorMessage('No s’ha trobat aquest jardí');
          return;
        }

        setName(field.name);
        setLocation(field.location ?? '');
        setFieldType(field.field_type ?? FIELD_TYPES[0]);
        setSoilType(field.soil_type ?? SOIL_TYPES[0]);
        setSizeM2(field.size_m2 != null ? String(field.size_m2) : '');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No s’ha pogut carregar el jardí';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isFinite(fieldId)) {
      setErrorMessage('Identificador invàlid');
      setLoading(false);
      return;
    }

    void loadField();
  }, [fieldId]);

  async function handleAccept() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('El nom és obligatori');
      return;
    }

    const parsedSize = sizeM2.trim() === '' ? null : Number(sizeM2);
    if (parsedSize != null && !Number.isFinite(parsedSize)) {
      setErrorMessage('La mida ha de ser un número');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      await updateField(fieldId, {
        name: trimmedName,
        location: location.trim() || null,
        field_type: fieldType || null,
        soil_type: soilType || null,
        size_m2: parsedSize,
      });
      router.replace('/app/settings');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’ha pogut guardar el jardí';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Edit garden</Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {loading ? (
            <Text style={styles.label}>Carregant…</Text>
          ) : (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                editable={!saving}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                editable={!saving}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={fieldType}
                  onValueChange={setFieldType}
                  enabled={!saving}
                  style={styles.picker}
                >
                  {FIELD_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Soil</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={soilType}
                  onValueChange={setSoilType}
                  enabled={!saving}
                  style={styles.picker}
                >
                  {SOIL_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Size (m²)</Text>
              <TextInput
                style={styles.input}
                value={sizeM2}
                onChangeText={setSizeM2}
                keyboardType="numeric"
                editable={!saving}
              />
            </>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.replace('/app/settings')}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.acceptButton]}
              onPress={() => void handleAccept()}
              disabled={saving || loading}
            >
              <Text style={styles.acceptText}>
                {saving ? 'Guardant…' : 'Acceptar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
