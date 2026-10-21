export interface PrivacySection97 {
  title: string;
  items: string[];
}

export const NATIVE_SCAN_PRIVACY_KEY97 = 'matchrim.scan_privacy_notice.openai-local.v4';

export const NATIVE_SCAN_PROVIDER_NOTICE97 = 'Con el análisis con IA, la imagen y sus recortes se envían al backend de Matchrim en Supabase y a OpenAI. En el modo local Una etiqueta, Apple Vision lee en este iPhone y solo el texto se consulta en Winerim; la foto no se envía. No subas imágenes con personas o datos sensibles.';

export const nativePrivacySections97 = (sections: PrivacySection97[]): PrivacySection97[] => sections.map(section =>
  section.title === 'Servicios y encargados' ? {
    ...section,
    items: section.items.map((item, index) => index === 1
      ? 'El backend de Matchrim usa la API de OpenAI para detectar regiones, leer etiquetas, cartas y platos, y generar recomendaciones. Si eliges ese análisis con IA, las imágenes y los recortes se envían a OpenAI a través de las funciones de Matchrim. El modo local Una etiqueta usa Apple Vision en el iPhone: la foto no se envía y solo el texto leído se consulta en el catálogo Winerim.'
      : item),
  } : section,
);
