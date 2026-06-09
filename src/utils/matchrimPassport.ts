import { generateMatchrimName } from './profileUtils';

export interface MatchrimProfileLike {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const encodeDigit = (value: number) => clamp(Math.round(value), 0, 5).toString();

export const generateMatchrimCode = (profile: MatchrimProfileLike) => generateMatchrimName(profile);

export const encodeProfileVector = (profile: MatchrimProfileLike) =>
  `${encodeDigit(profile.potente)}${encodeDigit(profile.acidez)}${encodeDigit(profile.dulce)}${encodeDigit(profile.tanico)}${encodeDigit(profile.afrutado)}`;

export const buildMatchrimShareUrl = (profile: MatchrimProfileLike, code = generateMatchrimCode(profile)) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://winerim.wine';
  const params = new URLSearchParams({
    code,
    v: encodeProfileVector(profile),
  });

  return `${origin}/usar-matchrim?${params.toString()}`;
};

export const buildWinerimCartaUrl = (
  profile: MatchrimProfileLike,
  code = generateMatchrimCode(profile),
  restaurantId?: string
) => {
  const baseUrl = import.meta.env.VITE_WINERIM_APP_URL || 'https://winerim.wine';
  const params = new URLSearchParams({
    matchrimCode: code,
    p: profile.potente.toString(),
    a: profile.acidez.toString(),
    d: profile.dulce.toString(),
    t: profile.tanico.toString(),
    f: profile.afrutado.toString(),
  });

  if (restaurantId?.trim()) {
    params.set('restaurant', restaurantId.trim());
  }

  return `${baseUrl.replace(/\/$/, '')}/?${params.toString()}`;
};

export const getProfileScale10 = (profile: MatchrimProfileLike) => ({
  potencia: clamp(Math.round(profile.potente * 2), 1, 10),
  acidez: clamp(Math.round(profile.acidez * 2), 1, 10),
  dulzura: clamp(Math.round(profile.dulce * 2), 1, 10),
  taninos: clamp(Math.round(profile.tanico * 2), 1, 10),
  afrutado: clamp(Math.round(profile.afrutado * 2), 1, 10),
});
