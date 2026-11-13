// 151: «a veces tengo una captura de una botella y desde la app no la encuentro buscando fotos; con otras apps la
// copio y la pego» (13-nov). The scanner takes a photo copied in Fotos, WhatsApp or the browser: the person copies
// it there and taps «Pegar foto» here. iOS asks for permission to paste each time; nothing is read without that tap.
export const pastedPhoto151 = async (): Promise<File | 'none' | 'unavailable'> => {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.read !== 'function') return 'unavailable';
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find(value => value.startsWith('image/'));
      if (!type) continue;
      const blob = await item.getType(type);
      return new File([blob], `foto-pegada.${type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'}`, { type });
    }
    return 'none';
  } catch {
    // Permission declined, or a clipboard with nothing readable: both end in the same advice.
    return 'none';
  }
};
export const PASTE_HELP151 = 'No hay ninguna foto copiada. Abre la foto, toca Compartir y «Copiar foto»; después vuelve y toca «Pegar foto».';
