import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/DateField';
import { Colors } from '@/constants/theme';
import type { GardenTask, TaskPriority } from '@/services/api';
import { priorityColor, priorityTint, styles } from '@/styles/tasks.styles';
import { PRIORITY_ORDER, isIsoDay, type TaskValues } from '@/utils/tasks';

type Props = {
  visible: boolean;
  /** The task to edit. Empty to create a new one. */
  task: GardenTask | null;
  /** The day a new task starts on. */
  defaultDay: string;
  onClose: () => void;
  onSave: (values: TaskValues) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

/** A sheet to create a task or to edit one: text, details, priority and day. */
export function TaskEditor({
  visible,
  task,
  defaultDay,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [day, setDay] = useState(defaultDay);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Start from the task being edited, or from an empty form.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(task?.title ?? '');
    setDetails(task?.details ?? '');
    setPriority(task?.priority ?? 'medium');
    setDay(task?.due_on ?? defaultDay);
    setConfirmDelete(false);
    setBusy(false);
  }, [visible, task, defaultDay]);

  const canSave = title.trim().length > 0 && isIsoDay(day) && !busy;

  async function save() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    const saved = await onSave({ title, details, priority, day });
    setBusy(false);
    if (saved) {
      onClose();
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const removed = await onDelete();
    setBusy(false);
    if (removed) {
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View testID="task-editor" style={styles.backdrop}>
        <Pressable
          testID="task-editor-backdrop"
          accessibilityLabel={t('tasks.cancel')}
          style={{ flex: 1, width: '100%' }}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.sheet}
            bounces={false}
          >
            <Text style={styles.sheetTitle}>
              {task ? t('tasks.editTask') : t('tasks.newTask')}
            </Text>

            {task?.source === 'ai' ? (
              <Text testID="task-ai-hint" style={styles.hint}>
                {t('tasks.aiEditHint')}
              </Text>
            ) : null}

            <TextInput
              testID="task-input"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('tasks.placeholder')}
              placeholderTextColor={Colors.light.textMuted}
              maxLength={200}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
            />

            <Text style={styles.fieldLabel}>{t('tasks.detailsLabel')}</Text>
            <TextInput
              testID="task-details-input"
              style={[styles.input, styles.inputMultiline]}
              value={details}
              onChangeText={setDetails}
              placeholder={t('tasks.detailsPlaceholder')}
              placeholderTextColor={Colors.light.textMuted}
              maxLength={500}
              multiline
            />

            <Text style={styles.fieldLabel}>{t('tasks.priorityLabel')}</Text>
            <View style={styles.priorities}>
              {PRIORITY_ORDER.map((level) => (
                <Pressable
                  key={level}
                  testID={`task-priority-${level}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: priority === level }}
                  style={[
                    styles.priorityChip,
                    priority === level && {
                      backgroundColor: priorityTint[level],
                      borderColor: priorityColor[level],
                    },
                  ]}
                  onPress={() => setPriority(level)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: priorityColor[level] },
                    ]}
                  >
                    {t(`tasks.${level}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('tasks.dayLabel')}</Text>
            <DateField
              value={day}
              onChange={setDay}
              placeholder={t('tasks.dayLabel')}
            />

            <View style={styles.sheetActions}>
              <Pressable
                testID="task-cancel"
                accessibilityRole="button"
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>{t('tasks.cancel')}</Text>
              </Pressable>
              <Pressable
                testID="task-save"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                style={[styles.button, !canSave && styles.buttonDisabled]}
                onPress={() => void save()}
              >
                <Text style={styles.buttonText}>
                  {task ? t('tasks.save') : t('tasks.add')}
                </Text>
              </Pressable>
            </View>

            {task?.can_delete ? (
              <Pressable
                testID="task-delete"
                accessibilityRole="button"
                disabled={busy}
                style={styles.deleteButton}
                onPress={() => void remove()}
              >
                <Text style={styles.deleteText}>
                  {confirmDelete ? t('tasks.deleteConfirm') : t('tasks.delete')}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
