// Text <-> Base64 conversion for Bluetooth LE.
//
// react-native-ble-plx reads and writes characteristic values as Base64
// strings, while the AgriTwin board exchanges plain UTF-8 text (Wi-Fi name,
// password, status...). These helpers do the conversion without relying on
// Buffer, atob or TextEncoder, which are not available on every React Native
// engine.

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let text = '';
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index];
    let code: number;
    let length: number;
    if (first < 0x80) {
      code = first;
      length = 1;
    } else if (first >= 0xf0) {
      code = first & 0x07;
      length = 4;
    } else if (first >= 0xe0) {
      code = first & 0x0f;
      length = 3;
    } else {
      code = first & 0x1f;
      length = 2;
    }
    for (let offset = 1; offset < length; offset++) {
      code = (code << 6) | ((bytes[index + offset] ?? 0) & 0x3f);
    }
    text += String.fromCodePoint(code);
    index += length;
  }
  return text;
}

/** Converts plain text to the Base64 value expected by react-native-ble-plx. */
export function textToBase64(text: string): string {
  const bytes = utf8Encode(text);
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk =
      (bytes[index] << 16) |
      ((bytes[index + 1] ?? 0) << 8) |
      (bytes[index + 2] ?? 0);
    output += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    output += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    output +=
      index + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : '=';
    output += index + 2 < bytes.length ? BASE64_ALPHABET[chunk & 0x3f] : '=';
  }
  return output;
}

/** Converts a Base64 value received from react-native-ble-plx to text. */
export function base64ToText(base64: string | null | undefined): string {
  if (!base64) {
    return '';
  }
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const values = [0, 1, 2, 3].map((offset) => {
      const char = clean[index + offset];
      return char === undefined ? -1 : BASE64_ALPHABET.indexOf(char);
    });
    const chunk =
      (values[0] << 18) |
      (values[1] << 12) |
      (Math.max(values[2], 0) << 6) |
      Math.max(values[3], 0);
    bytes.push((chunk >> 16) & 0xff);
    if (values[2] >= 0) {
      bytes.push((chunk >> 8) & 0xff);
    }
    if (values[3] >= 0) {
      bytes.push(chunk & 0xff);
    }
  }
  return utf8Decode(bytes);
}
