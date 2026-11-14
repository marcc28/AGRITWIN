
import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

const palette = Colors.light;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.loadingSky,
  },

  sun: {
    position: 'absolute',
    top: 56,
    right: '13%',
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: palette.loadingSun,
    shadowColor: palette.loadingSun,
    shadowOpacity: 0.75,
    shadowRadius: 24,
    elevation: 10,
  },

  star: {
    position: 'absolute',
    top: 0,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.loadingStar,
  },

  landscape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    backgroundColor: palette.loadingField,
    borderTopWidth: 12,
    borderTopColor: palette.loadingFieldHighlight,
  },

  fieldLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
    borderTopWidth: 2,
    borderColor: palette.loadingFieldLines,
    transform: [{ skewY: '-8deg' }],
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 20,
  },

  farmer: {
    width: 190,
    height: 205,
    alignItems: 'center',
    marginBottom: 18,
  },

  hatBrim: {
    position: 'absolute',
    top: 12,
    width: 106,
    height: 19,
    borderRadius: 50,
    backgroundColor: palette.farmerHat,
    zIndex: 4,
  },

  hatCrown: {
    position: 'absolute',
    top: 0,
    width: 64,
    height: 30,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomWidth: 4,
    borderColor: palette.farmerHatDark,
    backgroundColor: palette.farmerHat,
    zIndex: 5,
  },

  head: {
    position: 'absolute',
    top: 22,
    width: 65,
    height: 65,
    borderRadius: 34,
    backgroundColor: palette.farmerSkin,
    zIndex: 3,
  },

  eye: {
    position: 'absolute',
    top: 25,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.farmerFace,
  },

  leftEye: {
    left: 14,
  },

  rightEye: {
    right: 14,
  },

  moustache: {
    position: 'absolute',
    left: 19,
    top: 43,
    width: 28,
    height: 9,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: palette.farmerMoustache,
  },

  torso: {
    position: 'absolute',
    top: 82,
    width: 76,
    height: 84,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: palette.farmerClothes,
    alignItems: 'center',
    zIndex: 2,
  },

  overalls: {
    position: 'absolute',
    top: 33,
    width: 38,
    height: 28,
    borderRadius: 4,
    backgroundColor: palette.farmerOveralls,
    borderTopWidth: 5,
    borderColor: palette.farmerOverallsDetail,
  },

  arm: {
    position: 'absolute',
    top: 91,
    width: 34,
    height: 22,
    borderRadius: 12,
    backgroundColor: palette.farmerArms,
    zIndex: 1,
  },

  leftArm: {
    left: 39,
    transform: [{ rotate: '-16deg' }],
  },

  rightArm: {
    right: 39,
    transform: [{ rotate: '16deg' }],
  },

  leg: {
    position: 'absolute',
    top: 158,
    width: 21,
    height: 34,
    borderBottomWidth: 7,
    borderBottomColor: palette.farmerShoes,
    backgroundColor: palette.farmerPants,
    zIndex: 1,
  },

  leftLeg: {
    left: 66,
    transform: [{ rotate: '8deg' }],
  },

  rightLeg: {
    right: 66,
    transform: [{ rotate: '-8deg' }],
  },

  rakeHandle: {
    position: 'absolute',
    top: 45,
    right: 45,
    width: 7,
    height: 114,
    borderRadius: 4,
    backgroundColor: palette.rakeWood,
    transform: [{ rotate: '20deg' }],
    zIndex: 4,
  },

  rakeHead: {
    position: 'absolute',
    top: -3,
    left: -19,
    width: 45,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.rakeMetal,
  },

  rakeTooth: {
    position: 'absolute',
    top: 5,
    width: 4,
    height: 13,
    borderRadius: 2,
    backgroundColor: palette.rakeMetal,
  },

  title: {
    color: palette.primaryDark,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  subtitle: {
    color: '#46614F',
    fontSize: 16,
    marginTop: 5,
  },

  progressTrack: {
    width: '76%',
    maxWidth: 320,
    height: 9,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 21,
    backgroundColor: palette.loadingProgressTrack,
  },

  progressIndicator: {
    width: '38%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: palette.loadingProgress,
  },
});
