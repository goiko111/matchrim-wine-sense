// Shared helper to compute the redirect origin used for Supabase auth emails
// (signup confirmation, password recovery, magic links).
//
// Web → window.location.origin
// Native (Capacitor) → VITE_AUTH_REDIRECT_ORIGIN → VITE_MATCHRIM_WEB_URL →
//                      VITE_WINERIM_APP_URL → https://winerim.wine
//
// NOTE: VITE_AUTH_REDIRECT_ORIGIN must be set in Lovable Project Settings
// (Environment Variables) for production: VITE_AUTH_REDIRECT_ORIGIN=https://winerim.wine
import { Capacitor } from '@capacitor/core';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

export function getAuthRedirectOrigin(): string {
  const env = import.meta.env as Record<string, string | undefined>;

  // On the web the user is already on the right origin.
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return trimSlash(window.location.origin);
  }

  const fromEnv =
    env.VITE_AUTH_REDIRECT_ORIGIN ||
    env.VITE_MATCHRIM_WEB_URL ||
    env.VITE_WINERIM_APP_URL;

  return trimSlash(fromEnv || 'https://winerim.wine');
}

export function buildSignupRedirect(): string {
  const origin = getAuthRedirectOrigin();
  return `${origin}/?confirmed=true`;
}

export function buildPasswordResetRedirect(): string {
  const origin = getAuthRedirectOrigin();
  return `${origin}/reset-password?mode=recovery`;
}
