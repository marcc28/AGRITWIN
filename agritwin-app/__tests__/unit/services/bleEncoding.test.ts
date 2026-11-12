import { base64ToText, textToBase64 } from '@/services/bleEncoding';

describe('bleEncoding', () => {
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['connect', 'Y29ubmVjdA=='],
  ])('encodes %p as standard Base64', (text, base64) => {
    expect(textToBase64(text)).toBe(base64);
    expect(base64ToText(base64)).toBe(text);
  });

  it.each([
    'Casa Pérez',
    'WiFi_Ñandú',
    'Ca n’Andreu 2,4 GHz',
    'Ферма',
    'Campo 🌱',
    '{"device_id":"esp32_A1B2C3D4E5F6","fw":"0.1.0"}',
  ])('keeps UTF-8 text unchanged in a round trip: %p', (text) => {
    expect(base64ToText(textToBase64(text))).toBe(text);
  });

  it('encodes multi-byte characters as UTF-8', () => {
    // "é" is 0xC3 0xA9 in UTF-8
    expect(textToBase64('é')).toBe('w6k=');
    // "🌱" is 0xF0 0x9F 0x8C 0xB1 in UTF-8
    expect(textToBase64('🌱')).toBe('8J+MsQ==');
  });

  it('returns an empty string for missing values', () => {
    expect(base64ToText(null)).toBe('');
    expect(base64ToText(undefined)).toBe('');
    expect(base64ToText('')).toBe('');
  });

  it('ignores characters that are not Base64', () => {
    expect(base64ToText('Y29u\nbmVj dA==')).toBe('connect');
  });
});
