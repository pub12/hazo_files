/**
 * Google Drive OAuth Authentication Handler
 * Manages OAuth flow, token storage, and token refresh
 */

import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
  scope?: string;
}

export interface AuthCallbacks {
  onTokensUpdated?: (tokens: TokenData) => Promise<void>;
  getStoredTokens?: () => Promise<TokenData | null>;
}

/**
 * OAuth scopes required for file management
 */
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Google Drive Authentication Manager
 */
export class GoogleDriveAuth {
  private oauth2Client: OAuth2Client;
  private callbacks: AuthCallbacks;
  private tokens: TokenData | null = null;

  constructor(config: GoogleAuthConfig, callbacks: AuthCallbacks = {}) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.callbacks = callbacks;

    // Set up automatic token refresh
    this.oauth2Client.on('tokens', async (tokens) => {
      if (this.tokens) {
        const updatedTokens: TokenData = {
          ...this.tokens,
          accessToken: tokens.access_token || this.tokens.accessToken,
          expiryDate: tokens.expiry_date ?? this.tokens.expiryDate,
        };

        if (tokens.refresh_token) {
          updatedTokens.refreshToken = tokens.refresh_token;
        }

        this.tokens = updatedTokens;

        if (this.callbacks.onTokensUpdated) {
          await this.callbacks.onTokensUpdated(updatedTokens);
        }
      }
    });
  }

  /**
   * Get the OAuth2 client instance
   */
  getClient(): OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * Generate the authorization URL for OAuth consent
   */
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_DRIVE_SCOPES,
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);

    this.tokens = {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date || undefined,
      scope: tokens.scope || undefined,
    };

    this.oauth2Client.setCredentials(tokens);

    if (this.callbacks.onTokensUpdated) {
      await this.callbacks.onTokensUpdated(this.tokens);
    }

    return this.tokens;
  }

  /**
   * Set tokens directly (e.g., from stored tokens)
   */
  async setTokens(tokens: TokenData): Promise<void> {
    this.tokens = tokens;

    const credentials: Credentials = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    };

    this.oauth2Client.setCredentials(credentials);
  }

  /**
   * Load tokens from storage using callback
   */
  async loadStoredTokens(): Promise<boolean> {
    if (!this.callbacks.getStoredTokens) {
      return false;
    }

    const tokens = await this.callbacks.getStoredTokens();
    if (tokens) {
      await this.setTokens(tokens);
      return true;
    }

    return false;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !!this.tokens.accessToken;
  }

  /**
   * Get current tokens
   */
  getTokens(): TokenData | null {
    return this.tokens;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<TokenData> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    this.tokens = {
      ...this.tokens,
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date || undefined,
    };

    if (this.callbacks.onTokensUpdated) {
      await this.callbacks.onTokensUpdated(this.tokens);
    }

    return this.tokens;
  }

  /**
   * Revoke access (disconnect)
   */
  async revokeAccess(): Promise<void> {
    if (this.tokens?.accessToken) {
      await this.oauth2Client.revokeToken(this.tokens.accessToken);
    }
    this.tokens = null;
    this.oauth2Client.setCredentials({});
  }

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpired(bufferSeconds = 300): boolean {
    if (!this.tokens?.expiryDate) {
      return false;
    }

    const now = Date.now();
    const expiry = this.tokens.expiryDate;

    return now >= expiry - bufferSeconds * 1000;
  }

  /**
   * Ensure valid access token (refresh if needed)
   */
  async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
  }
}

/**
 * Create a new GoogleDriveAuth instance
 */
export function createGoogleDriveAuth(
  config: GoogleAuthConfig,
  callbacks?: AuthCallbacks
): GoogleDriveAuth {
  return new GoogleDriveAuth(config, callbacks);
}
