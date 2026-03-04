import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'bili_admin_session';
const SESSION_SEED = 'vib-70-admin-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || '';
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || getAdminPassword();
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function isAdminAuthConfigured(): boolean {
  return getAdminPassword().length > 0;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

function createAdminSessionToken(): string {
  const secret = getAuthSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(SESSION_SEED).digest('hex');
}

export function isValidAdminSessionToken(token?: string | null): boolean {
  if (!token) return false;
  const expected = createAdminSessionToken();
  if (!expected) return false;
  return safeEqual(token, expected);
}

export function getAdminSessionCookie(token: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export function getAdminLogoutCookie() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}

export function createLoginSessionCookie() {
  const token = createAdminSessionToken();
  if (!token) return null;
  return getAdminSessionCookie(token);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(token);
}

export function isAdminRequest(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(token);
}
