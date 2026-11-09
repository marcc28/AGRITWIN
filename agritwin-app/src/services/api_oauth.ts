import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// --------------------------------------------------
// SOCIAL AUTHENTICATION
// --------------------------------------------------

export type SocialLoginSuccess = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type SocialSignupRequired = {
  status: 'signup_required';
  signup_token: string;
  email: string;
  name: string;
};

export type SocialLoginResponse = SocialLoginSuccess | SocialSignupRequired;

export type XLoginSuccess = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  username: string;
};

export type XSignupRequired = {
  status: 'signup_required';
  signup_token: string;
  name: string;
  email: string;
};


export type XLoginResponse = XLoginSuccess | XSignupRequired;

export type FacebookLoginSuccess = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  username: string;
};

export type FacebookSignupRequired = {
  status: 'signup_required';
  signup_token: string;
  name: string;
  email: string;
};

export type FacebookLoginResponse =
  | FacebookLoginSuccess
  | FacebookSignupRequired;
function errorDetail(data: any, fallback: string): string {
  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item: any) => item.msg ?? JSON.stringify(item))
      .join(', ');
  }

  return fallback;
}

export async function socialGoogleLogin(
  idToken: string,
): Promise<SocialLoginResponse> {
  const response = await fetch(`${API_URL}/api/v1/social/google/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id_token: idToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'Google authentication failed'));
  }

  return data as SocialLoginResponse;
}

export async function completeSocialSignup(
  signupToken: string,
  username: string,
  privacyAccepted: boolean,
  securityAccepted: boolean,
) {
  const response = await fetch(`${API_URL}/api/v1/social/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signup_token: signupToken,
      username,
      privacy_terms_accepted: privacyAccepted,
      security_terms_accepted: securityAccepted,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'Could not complete social signup'));
  }

  return data;
}
export async function exchangeXLoginTicket(
  ticket: string,
): Promise<XLoginResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/social/x/exchange`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticket }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      errorDetail(data, 'X authentication failed'),
    );
  }

  return data as XLoginResponse;
}

export async function exchangeFacebookLoginTicket(
  ticket: string,
): Promise<FacebookLoginResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/social/facebook/exchange`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticket }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      errorDetail(data, 'Facebook authentication failed'),
    );
  }

  return data as FacebookLoginResponse;
}