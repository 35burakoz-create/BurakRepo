'use client';

import { getBrowserSupabase } from './supabase-browser';

export async function getAccessToken() {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
