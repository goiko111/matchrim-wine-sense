import { Capacitor } from '@capacitor/core';

export interface MatchrimProfileLike {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const encodeDigit = (value: number) => clamp(Math.round(value), 0, 5).toString();

export const normalizeMatchrimProfileForClassifier = (
  profile: MatchrimProfileLike,
): MatchrimProfileLike => {
  const normalize = (name: keyof MatchrimProfileLike) => {
    const value = Number(profile[name]);
    if (!Number.isFinite(value)) {
      throw new Error(`${name} debe ser un número entre 0 y 5`);
    }
    return clamp(Math.round(value), 0, 5);
  };

  return {
    potente: normalize('potente'),
    acidez: normalize('acidez'),
    dulce: normalize('dulce'),
    tanico: normalize('tanico'),
    afrutado: normalize('afrutado'),
  };
};

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getConsistentIndex = (profile: MatchrimProfileLike, seed: string, max: number): number => {
  const profileString = `${profile.potente}-${profile.acidez}-${profile.dulce}-${profile.tanico}-${profile.afrutado}-${seed}`;
  return simpleHash(profileString) % max;
};

const firstNames: Record<string, string[]> = {
  Potente: ['Garnacha', 'Tempranillo', 'Monastrell', 'Malbec'],
  Acidez: ['Albariño', 'Godello', 'Riesling', 'Sauvignon'],
  Dulce: ['Moscatel', 'Pedro', 'Malvasía', 'Gewürztraminer'],
  Tánico: ['Cabernet', 'Syrah', 'Mencía', 'Nebbiolo'],
  Afrutado: ['Merlot', 'Pinot', 'Verdejo', 'Chardonnay'],
};

const lastNames: Record<string, string[]> = {
  Potente: ['Roble', 'Bravo', 'Intenso', 'Solar'],
  Acidez: ['Fresco', 'Vibrante', 'Atlántico', 'Luz'],
  Dulce: ['Miel', 'Ámbar', 'Terciopelo', 'Dorado'],
  Tánico: ['Tierra', 'Especia', 'Fuego', 'Noble'],
  Afrutado: ['Jardín', 'Aroma', 'Primavera', 'Velo'],
};

export const generateMatchrimCode = (profile: MatchrimProfileLike): string => {
  const attributes = [
    { name: 'Potente', value: profile.potente },
    { name: 'Acidez', value: profile.acidez },
    { name: 'Dulce', value: profile.dulce },
    { name: 'Tánico', value: profile.tanico },
    { name: 'Afrutado', value: profile.afrutado },
  ];

  attributes.sort((a, b) => b.value - a.value);

  const firstNameIndex = getConsistentIndex(profile, 'first', firstNames[attributes[0].name].length);
  const lastNameIndex = getConsistentIndex(profile, 'last', lastNames[attributes[1].name].length);

  return `${firstNames[attributes[0].name][firstNameIndex]} ${lastNames[attributes[1].name][lastNameIndex]}`;
};

export const encodeProfileVector = (profile: MatchrimProfileLike) =>
  `${encodeDigit(profile.potente)}${encodeDigit(profile.acidez)}${encodeDigit(profile.dulce)}${encodeDigit(profile.tanico)}${encodeDigit(profile.afrutado)}`;

export const resolveMatchrimShareOrigin = (currentOrigin: string | undefined, native: boolean, publicOrigin?: string) => {
  if (!native) return currentOrigin || 'https://winerim.wine';
  if (!publicOrigin) throw new Error('Falta configurar el enlace público de Matchrim');
  const url = new URL(publicOrigin);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.search || url.hash || url.pathname !== '/') {
    throw new Error('El enlace público de Matchrim no es válido');
  }
  return url.origin;
};

export const buildMatchrimShareUrl = (profile: MatchrimProfileLike, code = generateMatchrimCode(profile)) => {
  const origin = resolveMatchrimShareOrigin(
    typeof window !== 'undefined' ? window.location.origin : undefined,
    Capacitor.isNativePlatform(),
    import.meta.env.VITE_MATCHRIM_SHARE_ORIGIN,
  );
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
