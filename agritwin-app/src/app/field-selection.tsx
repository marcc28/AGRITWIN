import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import AppHeader from '@/components/AppHeader';
import { FieldPhoto } from '@/components/FieldPhoto';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';
import { gardenPhotoAt } from '@/constants/gardenPhotos';
import { useCachedQuery, useRefreshOnFocus } from '@/hooks/use-cached-query';
import { Colors } from '@/constants/theme';
import { deleteField, isAuthError, type Field } from '@/services/api';
import { clearAuth } from '@/services/auth';
import {
  clearCurrentField,
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '@/services/currentField';
import {
  DEVICE_HEALTH_COLOR,
  deviceHealthFromCounts,
} from '@/services/deviceHealth';
import { loadGardenPickerFields } from '@/services/gardenPicker';
import { fieldsQuery, prefetchFieldData, queryKeys } from '@/services/queries';
import { queryClient } from '@/services/queryClient';
import { styles } from '@/styles/field-selection.styles';

export default function FieldSelectionScreen() {
  const { t } = useTranslation();
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [toDelete, setToDelete] = useState<Field | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Gardens from the cache are shown at once and refreshed in the background
  // (and again whenever the screen gets focus and they are stale).
  const fieldsResult = useCachedQuery(fieldsQuery());
  useRefreshOnFocus(fieldsResult, true, 'always');
  const fields = fieldsResult.data ?? [];
  const loading = fieldsResult.data === undefined && !fieldsResult.isError;
  const errorMessage =
    deleteError || (fieldsResult.isError ? t('fieldSelection.loadError') : '');
  const sessionExpired = isAuthError(fieldsResult.error);

  useEffect(() => {
    if (!sessionExpired) {
      return;
    }
    async function logOut() {
      await clearAuth();
      router.replace('/auth/login');
    }
    void logOut();
  }, [sessionExpired]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadCurrent = () => {
        void getCurrentField()
          .catch(() => null)
          .then((stored) => {
            if (active) {
              setCurrentId(stored?.id ?? null);
            }
            if (active && stored) {
              // The garden used last time is the one most likely chosen.
              prefetchFieldData(stored.id, i18next.language);
            }
          });
      };

      loadCurrent();
      const unsubscribe = subscribeCurrentField(loadCurrent);
      return () => {
        active = false;
        unsubscribe();
      };
    }, []),
  );

  async function chooseField(field: Field) {
    // Home starts loading while the navigation animation runs.
    prefetchFieldData(field.id, i18next.language);
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

  async function confirmDelete(field: Field) {
    setDeleting(true);
    try {
      await deleteField(field.id);
      const remaining = fields.filter((item) => item.id !== field.id);
      queryClient.setQueryData(queryKeys.fields, remaining);
      setToDelete(null);
      setDeleteError('');
      if (remaining.length === 0) {
        await clearCurrentField();
      } else if (field.id === currentId) {
        await setCurrentField({
          id: remaining[0].id,
          name: remaining[0].name,
        });
      }
      await loadGardenPickerFields(true);
      if (remaining.length === 0) {
        router.replace('/create-field');
      }
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      setToDelete(null);
      setDeleteError(t('fieldSelection.deleteError'));
    } finally {
      setDeleting(false);
    }
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
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>
                  {t('settings.cancel')}
                </Text>
              </Pressable>
              <Pressable
                testID="field-delete-confirm"
                style={[styles.modalButton, styles.modalDelete]}
                onPress={() => toDelete && void confirmDelete(toDelete)}
                disabled={deleting}
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
