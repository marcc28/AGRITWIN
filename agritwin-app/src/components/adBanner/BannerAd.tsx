import { View } from 'react-native';

type BannerAdProps = {
  position?: 'top' | 'bottom';
  marginTop?: number;
  marginBottom?: number;
};

export default function BannerAd({
  marginTop = 20,
  marginBottom = 0,
}: BannerAdProps) {
  return <View style={{ marginTop, marginBottom }} />;
}

