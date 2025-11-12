/**
 * Capitaliza el tipo de vino (primera letra en mayúscula)
 * @param type - El tipo de vino (ej: "tinto", "blanco", "rosado")
 * @returns El tipo capitalizado (ej: "Tinto", "Blanco", "Rosado")
 */
export const formatWineType = (type: string | undefined): string => {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

/**
 * Mapeo de códigos ISO de países a nombres completos en español
 */
export const COUNTRY_NAMES: Record<string, string> = {
  'ES': 'España',
  'FR': 'Francia',
  'IT': 'Italia',
  'PT': 'Portugal',
  'DE': 'Alemania',
  'AR': 'Argentina',
  'CL': 'Chile',
  'US': 'Estados Unidos',
  'AU': 'Australia',
  'NZ': 'Nueva Zelanda',
  'GB': 'Reino Unido',
  'AT': 'Austria',
  'GR': 'Grecia',
  'HU': 'Hungría',
  'RO': 'Rumanía',
  'BG': 'Bulgaria',
  'HR': 'Croacia',
  'SI': 'Eslovenia',
  'ZA': 'Sudáfrica',
  'BR': 'Brasil',
  'UY': 'Uruguay',
  'MX': 'México',
  'CA': 'Canadá',
  'CN': 'China',
  'JP': 'Japón',
  'IN': 'India',
  'IL': 'Israel',
  'LB': 'Líbano',
  'TR': 'Turquía',
  'GE': 'Georgia',
  'CH': 'Suiza',
  'LU': 'Luxemburgo',
  'MD': 'Moldavia',
  'UA': 'Ucrania',
  'MA': 'Marruecos',
  'TN': 'Túnez',
  'DZ': 'Argelia',
};

/**
 * Convierte un código ISO de país a su nombre completo en español
 * @param countryCode - El código ISO del país (ej: "ES", "FR", "IT")
 * @returns El nombre completo del país o el código si no se encuentra en el mapeo
 */
export const formatCountryName = (countryCode: string | undefined): string => {
  if (!countryCode) return '';
  const upperCode = countryCode.toUpperCase();
  return COUNTRY_NAMES[upperCode] || countryCode;
};
