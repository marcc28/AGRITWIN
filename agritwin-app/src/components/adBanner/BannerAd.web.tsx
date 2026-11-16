import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface BannerAdProps {
  position?: 'top' | 'bottom';
  marginTop?: number;
  marginBottom?: number;
}

export default function BannerAd({
  marginTop = 20,
  marginBottom = 0,
}: BannerAdProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        marginTop,
        marginBottom,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
        }}
        data-ad-client="ca-pub-5472828884402627"
        data-ad-slot="9969549773"
        data-auto-format="rspv"
        data-full-width-responsive="true"
      />
    </div>
  );
}
