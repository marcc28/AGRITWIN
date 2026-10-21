import {
  Pressable,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export function OptionChip({
  label,
  selected,
  onPress,
  disabled,
  style,
  selectedStyle,
  textStyle,
  selectedTextStyle,
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
  selectedStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  selectedTextStyle: StyleProp<TextStyle>;
}>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[style, selected ? selectedStyle : null]}
    >
      <Text style={[textStyle, selected ? selectedTextStyle : null]}>
        {label}
      </Text>
    </Pressable>
  );
}
