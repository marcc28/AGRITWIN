
const mockFetch = jest.fn();

global.fetch = mockFetch as jest.Mock;

import {
  exchangeGoogleLoginTicket,
  socialGoogleLogin,
  completeSocialSignup,
  exchangeXLoginTicket,
  exchangeFacebookLoginTicket,
} from '@/services/api_oauth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

describe('api_oauth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResponse = (data: unknown, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(data),
  });

  describe('exchangeGoogleLoginTicket', () => {
    it('should exchange Google ticket successfully', async () => {
      const responseData = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
        username: 'testuser',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeGoogleLoginTicket('google-ticket');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/google/exchange`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: 'google-ticket' }),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('should return signup required response', async () => {
      const responseData = {
        status: 'signup_required',
        signup_token: 'signup-token',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeGoogleLoginTicket('google-ticket');

      expect(result).toEqual(responseData);
    });

    it('should throw API detail error', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Invalid Google ticket' }, false),
      );

      await expect(
        exchangeGoogleLoginTicket('invalid-ticket'),
      ).rejects.toThrow('Invalid Google ticket');
    });

    it('should use message when detail is not available', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ message: 'Google login failed' }, false),
      );

      await expect(
        exchangeGoogleLoginTicket('ticket'),
      ).rejects.toThrow('Google login failed');
    });

    it('should use fallback error when no detail or message exists', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, false));

      await expect(
        exchangeGoogleLoginTicket('ticket'),
      ).rejects.toThrow('Google authentication failed');
    });

    it('should format validation errors from detail array', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          {
            detail: [
              { msg: 'Field required' },
              { msg: 'Invalid ticket' },
            ],
          },
          false,
        ),
      );

      await expect(
        exchangeGoogleLoginTicket('ticket'),
      ).rejects.toThrow('Field required, Invalid ticket');
    });

    it('should stringify validation items without msg', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          {
            detail: [{ type: 'missing', loc: ['body', 'ticket'] }],
          },
          false,
        ),
      );

      await expect(
        exchangeGoogleLoginTicket('ticket'),
      ).rejects.toThrow(
        '{"type":"missing","loc":["body","ticket"]}',
      );
    });
  });

  describe('socialGoogleLogin', () => {
    it('should login with Google ID token successfully', async () => {
      const responseData = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await socialGoogleLogin('google-id-token');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/google/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_token: 'google-id-token',
          }),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('should return signup required response', async () => {
      const responseData = {
        status: 'signup_required',
        signup_token: 'signup-token',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await socialGoogleLogin('google-id-token');

      expect(result).toEqual(responseData);
    });

    it('should throw Google authentication error', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Invalid ID token' }, false),
      );

      await expect(
        socialGoogleLogin('invalid-token'),
      ).rejects.toThrow('Invalid ID token');
    });

    it('should use fallback error message', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, false));

      await expect(
        socialGoogleLogin('token'),
      ).rejects.toThrow('Google authentication failed');
    });
  });

  describe('completeSocialSignup', () => {
    it('should complete signup with all parameters', async () => {
      const responseData = {
        username: 'testuser',
        access_token: 'access-token',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await completeSocialSignup(
        'signup-token',
        'testuser',
        true,
        true,
        'test@example.com',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signup_token: 'signup-token',
            username: 'testuser',
            privacy_terms_accepted: true,
            security_terms_accepted: true,
            email: 'test@example.com',
          }),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('should omit email when it is undefined', async () => {
      mockFetch.mockResolvedValue(mockResponse({ success: true }));

      await completeSocialSignup(
        'signup-token',
        'testuser',
        true,
        false,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/signup`,
        expect.objectContaining({
          body: JSON.stringify({
            signup_token: 'signup-token',
            username: 'testuser',
            privacy_terms_accepted: true,
            security_terms_accepted: false,
          }),
        }),
      );
    });

    it('should omit email when it is an empty string', async () => {
      mockFetch.mockResolvedValue(mockResponse({ success: true }));

      await completeSocialSignup(
        'signup-token',
        'testuser',
        true,
        true,
        '',
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody).not.toHaveProperty('email');
    });

    it('should throw social signup API error', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Username already exists' }, false),
      );

      await expect(
        completeSocialSignup(
          'signup-token',
          'existinguser',
          true,
          true,
        ),
      ).rejects.toThrow('Username already exists');
    });

    it('should use fallback signup error', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, false));

      await expect(
        completeSocialSignup(
          'signup-token',
          'testuser',
          true,
          true,
        ),
      ).rejects.toThrow('Could not complete social signup');
    });
  });

  describe('exchangeXLoginTicket', () => {
    it('should exchange X ticket successfully', async () => {
      const responseData = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
        username: 'xuser',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeXLoginTicket('x-ticket');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/x/exchange`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: 'x-ticket' }),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('should return signup required response', async () => {
      const responseData = {
        status: 'signup_required',
        signup_token: 'signup-token',
        name: 'X User',
        email: 'x@example.com',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeXLoginTicket('x-ticket');

      expect(result).toEqual(responseData);
    });

    it('should throw X authentication error', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Invalid X ticket' }, false),
      );

      await expect(
        exchangeXLoginTicket('invalid-ticket'),
      ).rejects.toThrow('Invalid X ticket');
    });

    it('should use fallback X error', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, false));

      await expect(
        exchangeXLoginTicket('ticket'),
      ).rejects.toThrow('X authentication failed');
    });
  });

  describe('exchangeFacebookLoginTicket', () => {
    it('should exchange Facebook ticket successfully', async () => {
      const responseData = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
        username: 'facebookuser',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeFacebookLoginTicket('facebook-ticket');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/social/facebook/exchange`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: 'facebook-ticket' }),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('should return signup required response', async () => {
      const responseData = {
        status: 'signup_required',
        signup_token: 'signup-token',
        name: 'Facebook User',
        email: 'facebook@example.com',
      };

      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await exchangeFacebookLoginTicket('facebook-ticket');

      expect(result).toEqual(responseData);
    });

    it('should throw Facebook authentication error', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Invalid Facebook ticket' }, false),
      );

      await expect(
        exchangeFacebookLoginTicket('invalid-ticket'),
      ).rejects.toThrow('Invalid Facebook ticket');
    });

    it('should use fallback Facebook error', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, false));

      await expect(
        exchangeFacebookLoginTicket('ticket'),
      ).rejects.toThrow('Facebook authentication failed');
    });
  });

  describe('network and JSON errors', () => {
    it('should propagate fetch network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        exchangeGoogleLoginTicket('ticket'),
      ).rejects.toThrow('Network error');
    });

    it('should propagate JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(
        socialGoogleLogin('token'),
      ).rejects.toThrow('Invalid JSON');
    });
  });
});
