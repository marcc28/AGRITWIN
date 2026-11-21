import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    color: Colors.light.primaryDark,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: '#CADABF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    marginTop: 16,
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    maxWidth: 320,
    height: 5,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 28,
    backgroundColor: Colors.light.border,
  },
  progressIndicator: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
  },
});
