import { createHandler } from './handler.ts';

const WINERIM_API_URL = Deno.env.get('WINERIM_API_URL') ?? 'https://app.winerim.com';

Deno.serve(createHandler(WINERIM_API_URL));
