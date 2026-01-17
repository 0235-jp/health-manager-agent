/**
 * PKCE (Proof Key for Code Exchange) Utilities for Fitbit OAuth 2.0
 *
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically random code verifier.
 * Per RFC 7636, the code verifier should be between 43 and 128 characters.
 *
 * @returns A random code verifier string (128 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 96 random bytes, which will produce 128 base64url characters
  const buffer = crypto.randomBytes(96);
  return base64UrlEncode(buffer);
}

/**
 * Generate a code challenge from a code verifier using SHA-256.
 * This implements the S256 method as recommended by RFC 7636.
 *
 * @param codeVerifier - The code verifier to hash
 * @returns The base64url-encoded SHA-256 hash of the code verifier
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Generate a random state value for CSRF protection.
 *
 * @returns A random state string
 */
export function generateState(): string {
  const buffer = crypto.randomBytes(32);
  return base64UrlEncode(buffer);
}

/**
 * Encode a buffer as a base64url string.
 * Base64url encoding is base64 with + replaced by -, / replaced by _,
 * and padding (=) removed.
 *
 * @param buffer - The buffer to encode
 * @returns The base64url-encoded string
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * PKCE credentials for an OAuth flow.
 */
export interface PkceCredentials {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate all PKCE credentials for starting an OAuth flow.
 *
 * @returns An object containing code verifier, code challenge, and state
 */
export function generatePkceCredentials(): PkceCredentials {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}
