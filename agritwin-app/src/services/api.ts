const API_URL = 'https://backend-web-ur8z.onrender.com';

export type LegalDocument = {
  document_type: string;
  version: string;
  content: string;
};

// --------------------------------------------------
// SIGN UP
// --------------------------------------------------

export async function signup(
  username: string,
  email: string,
  password: string,
  passwordConfirm: string,
  privacyAccepted: boolean,
  securityAccepted: boolean,
) {
  const response = await fetch(`${API_URL}/api/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password,
      password_conf: passwordConfirm,
      privacy_terms_accepted: privacyAccepted,
      security_terms_accepted: securityAccepted,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "No s'ha pogut crear l'usuari",
    );
  }

  return data;
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export async function login(
  username: string,
  password: string,
) {
  const body = new URLSearchParams({
    username,
    password,
  }).toString();

  const response = await fetch(`${API_URL}/api/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Error iniciant sessió",
    );
  }

  return data;
}

// --------------------------------------------------
// PRIVACY NOTICE
// --------------------------------------------------

export async function getPrivacyPolicy(): Promise<LegalDocument> {
  const response = await fetch(
    `${API_URL}/api/v1/legal/privacy`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        'No s’ha pogut carregar la Privacy Notice',
    );
  }

  return data as LegalDocument;
}

// --------------------------------------------------
// SECURITY POLICY
// --------------------------------------------------

export async function getSecurityPolicy(): Promise<LegalDocument> {
  const response = await fetch(
    `${API_URL}/api/v1/legal/security`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        'No s’ha pogut carregar la Security Policy',
    );
  }

  return data as LegalDocument;
}