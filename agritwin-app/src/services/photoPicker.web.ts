import type { DiagnosisPhoto } from './api_diagnosis';

export type PickedPhoto = DiagnosisPhoto | 'denied' | 'blocked' | null;

export function choosePhoto(fromCamera: boolean): Promise<PickedPhoto> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.style.display = 'none';
    if (fromCamera) {
      input.setAttribute('capture', 'environment');
    }

    function finish(photo: PickedPhoto) {
      input.remove();
      resolve(photo);
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish(
        file
          ? {
              uri: URL.createObjectURL(file),
              mimeType: file.type || 'image/jpeg',
              file,
            }
          : null,
      );
    });
    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}
