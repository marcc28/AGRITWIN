import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AppHeader from '@/components/AppHeader';
import { FieldPhoto } from '@/components/FieldPhoto';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';
import { gardenPhotoAt } from '@/constants/gardenPhotos';
import { Colors } from '@/constants/theme';
import { getFields, isAuthError, type Field } from '@/services/api';
import { clearAuth } from '@/services/auth';
import {
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '@/services/currentField';
import {
  DEVICE_HEALTH_COLOR,
  deviceHealthFromCounts,
} from '@/services/deviceHealth';
import { styles } from '@/styles/field-selection.styles';

export default function FieldSelectionScreen() {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Field[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [managing, setManaging] = useState(false);
  const [toDelete, setToDelete] = useState<Field | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [list, stored] = await Promise.all([
            getFields(),
            getCurrentField(),
          ]);
          if (active) {
            setFields(list);
            setCurrentId(stored?.id ?? null);
            setErrorMessage('');
          }
        } catch (error) {
          if (isAuthError(error)) {
            await clearAuth();
            router.replace('/auth/login');
            return;
          }
          if (active) {
            setErrorMessage(t('fieldSelection.loadError'));
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();
      const unsubscribe = subscribeCurrentField(() => {
        void getCurrentField().then((stored) => {
          if (active) {
            setCurrentId(stored?.id ?? null);
          }
        });
      });
      return () => {
        active = false;
        unsubscribe();
      };
    }, [t]),
  );

  async function chooseField(field: Field) {
    await setCurrentField({ id: field.id, name: field.name });
    setCurrentId(field.id);
    router.push('/app/home');
  }

  function editField(field: Field) {
    router.push({
      pathname: '/edit-field',
      params: { id: String(field.id), from: 'field-selection' },
    });
  }

  function addField() {
    router.push({
      pathname: '/create-field',
      params: { from: 'field-selection' },
    });
  }

  return (
    <View style={styles.screen}>
      <AppHeader showProfile />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>{t('fieldSelection.eyebrow')}</Text>
              <Text style={styles.title}>{t('fieldSelection.title')}</Text>
            </View>
            {fields.length > 0 ? (
              <Pressable
                testID="field-selection-manage"
                style={[styles.manageButton, managing && styles.manageActive]}
                onPress={() => setManaging((value) => !value)}
              >
                <Ionicons
                  name={managing ? 'checkmark' : 'create-outline'}
                  size={16}
                  color={managing ? Colors.light.surface : Colors.light.primary}
                />
                <Text
                  style={[
                    styles.manageText,
                    managing && styles.manageTextActive,
                  ]}
                >
                  {managing
                    ? t('fieldSelection.done')
                    : t('fieldSelection.manage')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {loading ? (
            <Text style={styles.emptyText}>{t('settings.loading')}</Text>
          ) : (
            <View style={styles.grid}>
              {fields.map((field) => {
                const current = field.id === currentId;
                const connected =
                  deviceHealthFromCounts(
                    field.device_count,
                    field.devices_online ?? 0,
                  ) === 'ok';
                return (
                  <View key={field.id} style={styles.tile}>
                    <Pressable
                      testID={`field-tile-${field.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={
                        managing
                          ? t('fieldSelection.editField', { name: field.name })
                          : field.name
                      }
                      onPress={() =>
                        managing ? editField(field) : void chooseField(field)
                      }
                    >
                      <View style={styles.photoBox}>
                        <FieldPhoto fieldId={field.id} style={styles.photo} />
                        {managing ? (
                          <View style={styles.manageOverlay}>
                            <View style={styles.pencilCircle}>
                              <Ionicons
                                name="pencil"
                                size={22}
                                color={Colors.light.surface}
                              />
                            </View>
                          </View>
                        ) : null}
                        {current && !managing ? (
                          <View style={styles.currentBadge}>
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={Colors.light.surface}
                            />
                          </View>
                        ) : null}
                        <View
                          testID={`field-connection-${field.id}`}
                          accessibilityLabel={t(
                            connected
                              ? 'settings.fieldDetail.connected'
                              : 'settings.fieldDetail.disconnected',
                          )}
                          style={styles.connectionBadge}
                        >
                          <Ionicons
                            name="wifi"
                            size={20}
                            color={
                              DEVICE_HEALTH_COLOR[connected ? 'ok' : 'down']
                            }
                          />
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text
                          style={[styles.name, current && styles.nameCurrent]}
                          numberOfLines={1}
                        >
                          {field.name}
                        </Text>
                      </View>
                    </Pressable>

                    {managing ? (
                      <Pressable
                        testID={`field-delete-${field.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={t('fieldSelection.deleteField', {
                          name: field.name,
                        })}
                        style={styles.deleteButton}
                        onPress={() => setToDelete(field)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color={Colors.light.surface}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}

              <View style={styles.tile}>
                <Pressable
                  testID="field-selection-add"
                  accessibilityRole="button"
                  onPress={addField}
                >
                  <View style={[styles.photoBox, styles.addBox]}>
                    <Image
                      source={gardenPhotoAt(0)}
                      style={[styles.photo, styles.addPhoto]}
                      resizeMode="cover"
                    />
                    <View style={styles.addCircle}>
                      <Ionicons
                        name="add"
                        size={32}
                        color={Colors.light.surface}
                      />
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.addText}>
                      {t('fieldSelection.add')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <GardenPickerOverlay />

      <Modal
        visible={toDelete != null}
        transparent
        animationType="fade"
        onRequestClose={() => setToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('fieldSelection.deleteTitle', { name: toDelete?.name ?? '' })}
            </Text>
            <Text style={styles.modalText}>
              {t('fieldSelection.deleteMessage')}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setToDelete(null)}
              >
                <Text style={styles.modalCancelText}>
                  {t('settings.cancel')}
                </Text>
              </Pressable>
              <Pressable
                testID="field-delete-confirm"
                style={[styles.modalButton, styles.modalDelete]}
                onPress={() => setToDelete(null)}
              >
                <Text style={styles.modalDeleteText}>
                  {t('fieldSelection.deleteConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
