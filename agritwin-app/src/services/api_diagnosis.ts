import { getAuth } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export type CareLevel = 'lack' | 'ok' | 'excess' | 'unknown';
export type HarvestStatus = 'ready' | 'not_ready' | 'no_fruit' | 'unknown';

export type PlantDiagnosis = {
  healthy: boolean | null;
  name: string;
  confidence: number | null;
  advice: string | null;
  water: CareLevel;
  light: CareLevel;
  harvest: HarvestStatus;
  provider: string;
};

export type DiagnosisPhoto = {
  uri: string;
  mimeType: string;
  file?: Blob | null;
};

export class DiagnosisError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function diagnosePlant(
  photo: DiagnosisPhoto,
  lang: string,
): Promise<PlantDiagnosis> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const name = photo.mimeType === 'image/png' ? 'plant.png' : 'plant.jpg';
  const form = new FormData();

  if (photo.file) {
    form.append('image', photo.file, name);
  } else {
    form.append('image', {
      uri: photo.uri,
      name,
      type: photo.mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(
    `${API_URL}/api/v1/diagnosis?lang=${encodeURIComponent(lang)}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: form,
    },
  );

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new Error('Not authenticated');
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === 'string' ? data.detail : 'Diagnosis failed';
    throw new DiagnosisError(detail, response.status);
  }

  return data as PlantDiagnosis;
}
