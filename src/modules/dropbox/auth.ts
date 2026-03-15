/**
 * Dropbox OAuth Authentication Handler
 * Manages OAuth flow, token storage, and token refresh
 */

export interface DropboxAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DropboxTokenData {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}

export interface DropboxAuthCallbacks {
  onTokensUpdated?: (tokens: DropboxTokenData) => Promise<void>;
  getStoredTokens?: () => Promise<DropboxTokenData | null>;
}

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_REVOKE_URL = 'https://api.dropboxapi.com/2/auth/token/revoke';

/**
 * Dropbox Authentication Manager
 */
export class DropboxAuth {
  private config: DropboxAuthConfig;
  private callbacks: DropboxAuthCallbacks;
  private tokens: DropboxTokenData | null = null;

  constructor(config: DropboxAuthConfig, callbacks: DropboxAuthCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Generate the authorization URL for OAuth consent
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      token_access_type: 'offline',
    });
    if (state) {
      params.set('state', state);
    }
    return `${DROPBOX_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DropboxTokenData> {
    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${errorData}`);
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
    };

    if (this.callbacks.onTokensUpdated) {
      await this.callbacks.onTokensUpdated(this.tokens);
    }

    return this.tokens;
  }

  /**
   * Set tokens directly (e.g., from stored tokens)
   */
  async setTokens(tokens: DropboxTokenData): Promise<void> {
    this.tokens = tokens;
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
  getTokens(): DropboxTokenData | null {
    return this.tokens;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<DropboxTokenData> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to refresh token: ${errorData}`);
    }

    const data = await response.json();

    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiryDate: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
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
      try {
        await fetch(DROPBOX_REVOKE_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.tokens.accessToken}`,
          },
        });
      } catch {
        // Ignore revoke errors
      }
    }
    this.tokens = null;
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
 * Create a new DropboxAuth instance
 */
export function createDropboxAuth(
  config: DropboxAuthConfig,
  callbacks?: DropboxAuthCallbacks
): DropboxAuth {
  return new DropboxAuth(config, callbacks);
}
