import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { getCropDetailStyles } from '@/styles/crop-detail.styles';
import { getCropsStyles } from '@/styles/crops.styles';
import { getEditCropsStyles } from '@/styles/edit-crops.styles';
import { getFieldCropsStyles } from '@/styles/fieldcrops.styles';
import { createRecommendationsStyles } from '@/styles/recommendations.styles';
import {
  getResponsiveProfile,
  responsiveValue,
  valueAtWidth,
} from '@/styles/responsiveLayout';

describe('responsive crop styles', () => {
  it('selects width and device breakpoints from shared helpers', () => {
    const phone = getResponsiveProfile(320, 640);
    const landscape = getResponsiveProfile(844, 390);
    expect(phone.compact).toBe(true);
    expect(phone.shortScreen).toBe(true);
    expect(landscape.compactLandscape).toBe(true);
    expect(responsiveValue(phone, { compact: 12, default: 16 })).toBe(12);
    expect(
      valueAtWidth(
        1024,
        [
          [1600, 3],
          [1024, 2],
        ],
        1,
      ),
    ).toBe(2);
    expect(
      valueAtWidth(
        320,
        [
          [1600, 3],
          [1024, 2],
        ],
        1,
      ),
    ).toBe(1);
  });

  it('keeps field crop detail spacing responsive in portrait and landscape', () => {
    const portrait = getCropDetailStyles(390, 844);
    const landscape = getCropDetailStyles(844, 390);
    expect(portrait.container.marginTop).toBe(22);
    expect(landscape.container.marginTop).toBe(4);
    expect(landscape.scrollContent.paddingTop).toBe(10);
  });

  it('adapts crop list page sizing to phone and tablet widths', () => {
    const phone = getCropsStyles(320, 640);
    const tablet = getCropsStyles(800, 900);
    expect(phone.container.maxWidth).toBe(560);
    expect(phone.title.fontSize).toBe(22);
    expect(tablet.container.maxWidth).toBe(960);
    expect(tablet.scrollContent.paddingHorizontal).toBe(24);
  });

  it('adapts edit crop form and modal spacing for a short landscape phone', () => {
    const styles = getEditCropsStyles(844, 390);
    expect(styles.container.marginTop).toBe(4);
    expect(styles.cropModal.maxHeight).toBe('90%');
    expect(styles.dateFieldsRow.flexDirection).toBe('row');
  });

  it('reduces crop card height and spacing for landscape phones', () => {
    const portrait = getFieldCropsStyles(390, 844);
    const landscape = getFieldCropsStyles(844, 390);
    const portraitCrop = StyleSheet.flatten(portrait.crop);
    const landscapeCrop = StyleSheet.flatten(landscape.crop);
    expect(portrait.cropsGrid.width).toBe('100%');
    expect(landscapeCrop.minHeight).toBe(136);
    expect(landscapeCrop.minHeight).toBeLessThan(
      portraitCrop.minHeight as number,
    );
    expect(landscape.targetButton.minHeight).toBe(32);
  });

  it('supports both themes and adaptive recommendation columns', () => {
    const light = createRecommendationsStyles(false, 390, 844);
    const dark = createRecommendationsStyles(true, 700, 900);
    expect(light.container.backgroundColor).toBe(Colors.light.background);
    expect(dark.container.backgroundColor).toBe(Colors.dark.background);
    expect(StyleSheet.flatten(dark.recommendationCard).width).toBeGreaterThan(
      0,
    );
  });
});
