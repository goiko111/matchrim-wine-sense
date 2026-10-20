export interface PrivacySection97 {
  title: string;
  items: string[];
}

export const NATIVE_SCAN_PRIVACY_KEY97 = 'matchrim.scan_privacy_notice.openai.v3';

export const NATIVE_SCAN_PROVIDER_NOTICE97 = 'La imagen y sus recortes se envían al backend de Matchrim en Supabase y a OpenAI para leer el contenido e identificar vinos. No subas imágenes con personas o datos sensibles.';

export const nativePrivacySections97 = (sections: PrivacySection97[]): PrivacySection97[] => sections.map(section =>
  section.title === 'Servicios y encargados' ? {
    ...section,
    items: section.items.map((item, index) => index === 1
      ? 'El backend de Matchrim usa la API de OpenAI para detectar regiones, leer etiquetas, cartas y platos, y generar recomendaciones. Las imágenes y los recortes que seleccionas se envían a OpenAI a través de las funciones de Matchrim.'
      : item),
  } : section,
);
