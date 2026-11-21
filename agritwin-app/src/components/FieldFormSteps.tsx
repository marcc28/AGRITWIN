import { useEffect, useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/theme';

type Step = { title: string; hint: string };

export function FieldFormSteps({
  steps,
  currentStep,
  onStepChange,
  disabled = false,
  header,
  error,
  finalAction,
  children,
}: Readonly<{
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  disabled?: boolean;
  header: ReactNode;
  error?: string;
  finalAction: ReactNode;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep, error]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {header}
            <View
              style={styles.progress}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t('settings.fieldForm.progress', {
                current: currentStep + 1,
                total: steps.length,
              })}
              accessibilityValue={{
                min: 1,
                max: steps.length,
                now: currentStep + 1,
              }}
            >
              {steps.map((step, index) => (
                <View
                  key={step.title}
                  style={[
                    styles.segment,
                    index <= currentStep && styles.segmentActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.heading} accessibilityLiveRegion="polite">
              <Text style={styles.counter}>
                {t('settings.fieldForm.progress', {
                  current: currentStep + 1,
                  total: steps.length,
                })}
              </Text>
              <Text style={styles.title} accessibilityRole="header">
                {steps[currentStep].title}
              </Text>
              <Text style={styles.hint}>{steps[currentStep].hint}</Text>
              <Text style={styles.hint}>
                {t('settings.fieldForm.requiredHint')}
              </Text>
            </View>
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            {children}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.navigation}>
            {currentStep > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => onStepChange(currentStep - 1)}
                style={[styles.previous, disabled && styles.disabled]}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={Colors.light.primaryDark}
                />
                <Text style={styles.previousText}>
                  {t('settings.fieldForm.previous')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.spacer} />
            )}
            <View style={styles.action}>
              {currentStep === steps.length - 1 ? (
                finalAction
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => onStepChange(currentStep + 1)}
                  style={[styles.next, disabled && styles.disabled]}
                >
                  <Text style={styles.nextText}>
                    {t('settings.fieldForm.next')}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={Colors.light.surface}
                  />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 28,
  },
  container: { width: '100%', maxWidth: 560 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: Colors.light.border,
  },
  segmentActive: { backgroundColor: Colors.light.primary },
  heading: { marginTop: 22, marginBottom: 22, gap: 6 },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    letterSpacing: 0.6,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
  hint: { fontSize: 14, lineHeight: 21, color: Colors.light.textSecondary },
  error: { color: Colors.light.dangerText, fontSize: 14, marginBottom: 16 },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  navigation: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  spacer: { flex: 1 },
  action: { flex: 1 },
  previous: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  previousText: {
    color: Colors.light.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  next: {
    minHeight: 50,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
  },
  nextText: { color: Colors.light.surface, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
});
