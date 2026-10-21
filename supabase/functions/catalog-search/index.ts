import { createHandler } from './handler.ts';

const WINERIM_API_URL = Deno.env.get('WINERIM_API_URL') ?? 'https://app.winerim.com';
// Shared secret with the Winerim backend (MATCHRIM_SEARCH_KEY there). Set it as a Supabase secret.
const MATCHRIM_SEARCH_KEY = Deno.env.get('MATCHRIM_SEARCH_KEY') ?? '';

Deno.serve(createHandler(WINERIM_API_URL, MATCHRIM_SEARCH_KEY));
