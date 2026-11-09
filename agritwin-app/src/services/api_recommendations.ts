// services/api_recommendations.ts

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type Recommendation = {
  id: string;
  field_id: number;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | string;
  based_on?: {
    data?: string[];
    reason?: string;
  } | null;
  model: string;
  generated_at: string;
  expires_at: string;
};

// --------------------------------------------------
// GET RECOMMENDATIONS BY FIELD
// --------------------------------------------------

export async function getFieldRecommendations(
  fieldId: string | number,
  token: string,
): Promise<Recommendation[]> {
  const response = await fetch(
    `${API_URL}/api/v1/fields/${encodeURIComponent(fieldId)}/recommendations`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Error obtenint les recomanacions del camp',
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('La resposta de les recomanacions no és vàlida');
  }

  // Ens assegurem que només es mostrin les recomanacions
  // corresponents al camp seleccionat.
  return (data as Recommendation[]).filter(
    (recommendation) => String(recommendation.field_id) === String(fieldId),
  );
}
