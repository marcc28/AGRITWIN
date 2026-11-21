import { Pressable, Text, StyleSheet } from 'react-native';

type CheckoutButtonProps = {
  onPress: () => void | Promise<void>;
  title: string;
  disabled?: boolean;
};

export default function CheckoutButton({
  onPress,
  title,
  disabled = false,
}: CheckoutButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        (pressed || disabled) && styles.buttonInactive,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#236B45',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonInactive: {
    opacity: 0.55,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
